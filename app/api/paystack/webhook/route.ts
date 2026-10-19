import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/web-push-server';
import { notifyAdmins } from '@/lib/notify-admins';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { sendRefundProcessedEmail } from '@/lib/mailer';
import { normalizeRefundStatus } from '@/lib/paystackRefund';
import { settleCustomerPayment } from '@/lib/customerPayment';

// Service-role client — webhooks have no user session, so this bypasses RLS.
// Keep SUPABASE_SERVICE_ROLE_KEY server-only, never exposed to the client.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify the request really came from Paystack.
  const signature = req.headers.get('x-paystack-signature');
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');
  if (signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // ── Refund updates: refund.pending / processing / processed / failed / needs-attention ──
  if (typeof event.event === 'string' && event.event.startsWith('refund.')) {
    try {
      await handleRefundEvent(event, getBaseUrl(req));
    } catch (e) {
      console.error('paystack refund webhook error:', e);
    }
    return NextResponse.json({ received: true });
  }

  // ── Rider paid back cash-on-delivery money ──
  if (event.event === 'charge.success' && event.data?.metadata?.type === 'rider_remit') {
    const userId = event.data.metadata.user_id as string | undefined;
    const reference = event.data.reference as string;
    if (userId) {
      // The unique index on `reference` makes a repeated webhook harmless.
      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: userId, role: 'rider', type: 'remittance',
        amount: event.data.amount / 100, status: 'available',
        description: 'Cash paid back to Drovo', reference,
      });
    }
    return NextResponse.json({ received: true });
  }

  // ── Withdrawal results (money sent to a vendor's / rider's bank) ──
  if (typeof event.event === 'string' && event.event.startsWith('transfer.')) {
    const reference = event.data?.reference as string | undefined;
    if (reference) {
      if (event.event === 'transfer.success') {
        await supabaseAdmin.from('wallet_transactions').update({ status: 'paid' }).eq('reference', reference);
      } else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
        // 'failed' rows are not counted in the balance, so the money returns to the wallet.
        const { data: tx } = await supabaseAdmin.from('wallet_transactions')
          .update({ status: 'failed', description: `Withdrawal failed (${event.event.replace('transfer.', '')}). Money returned to your wallet.` })
          .eq('reference', reference).select('user_id, amount').maybeSingle();
        if (tx) {
          await supabaseAdmin.from('notifications').insert({
            user_id: tx.user_id, type: 'withdrawal_failed', title: 'Withdrawal failed',
            body: `Your withdrawal of ₦${Math.abs(Number(tx.amount)).toLocaleString()} could not be completed. The money is back in your wallet.`,
          });
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  // ── Card payment (Paystack popup) ──
  // Confirms the order even if the customer's phone lost network right after paying.
  if (event.event === 'charge.success' && event.data?.channel !== 'dedicated_nuban') {
    const reference = event.data?.reference as string | undefined;
    if (reference) {
      try {
        const r = await settleCustomerPayment(reference, Number(event.data.amount) / 100);
        if (r.result === 'underpaid') {
          await notifyAdmins({
            type: 'payment_underpaid',
            title: 'Customer paid less than the order total',
            body: `Reference ${reference}: paid ₦${Number(r.paidNaira).toLocaleString()}, order total ₦${Number(r.total).toLocaleString()}. The order was NOT marked paid.`,
            audience: 'admins_and_super',
            url: '/admin/orders',
          }).catch(() => {});
        }
        // The order may not be saved yet (phone still busy creating it). Ask Paystack to
        // send this again later - the checkout page also confirms it by itself.
        if (r.result === 'no_order' && reference.startsWith('drovo_')) {
          return NextResponse.json({ received: false, retry: true }, { status: 409 });
        }
      } catch (e) {
        console.error('card payment webhook error:', e);
        return NextResponse.json({ received: false }, { status: 500 }); // Paystack will retry
      }
    }
    return NextResponse.json({ received: true });
  }

  // ── Bank transfer to the customer's dedicated account ──
  if (event.event === 'charge.success' && event.data?.channel === 'dedicated_nuban') {
    const customerCode = event.data.customer?.customer_code;
    const amountNaira = Number(event.data.amount) / 100;
    const paystackReference = event.data.reference as string;

    if (!customerCode) return NextResponse.json({ received: true });

    try {
      // Paystack can send the same event twice - never process one transfer twice.
      const { data: already } = await supabaseAdmin.from('orders').select('id')
        .eq('payment_reference', paystackReference).maybeSingle();
      if (already) return NextResponse.json({ received: true });

      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id').eq('paystack_customer_code', customerCode).maybeSingle();

      const flagUnmatched = async (reason: string) => {
        await supabaseAdmin.from('unmatched_transfers').upsert(
          { reference: paystackReference, customer_id: profile?.id ?? null, amount: amountNaira, reason },
          { onConflict: 'reference', ignoreDuplicates: true });
        await notifyAdmins({
          type: 'transfer_unmatched',
          title: 'A bank transfer needs checking',
          body: `₦${amountNaira.toLocaleString()} arrived (ref ${paystackReference}) but ${reason}. Check it in Paystack and the orders page.`,
          audience: 'admins_and_super',
          url: '/admin/orders',
        }).catch(() => {});
      };

      if (!profile) { await flagUnmatched('no customer matches this account'); return NextResponse.json({ received: true }); }

      // This customer's waiting transfer orders, oldest first.
      const { data: pending } = await supabaseAdmin
        .from('orders')
        .select('id, total, order_number')
        .eq('customer_id', profile.id)
        .eq('payment_method', 'transfer')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);

      // Exact amount first; otherwise the oldest order the money fully covers.
      const list = pending ?? [];
      const order =
        list.find(o => Math.abs(Number(o.total) - amountNaira) < 1) ??
        list.find(o => Number(o.total) <= amountNaira + 1);

      if (!order) {
        await flagUnmatched(list.length
          ? 'it is LESS than the customer\'s order total (the order stays unpaid)'
          : 'the customer has no unpaid transfer order');
        return NextResponse.json({ received: true });
      }

      const { data: updated } = await supabaseAdmin.from('orders').update({
        payment_status: 'paid',
        payment_reference: paystackReference,
        paid_amount: amountNaira,
        payment_verified_at: new Date().toISOString(),
      }).eq('id', order.id).eq('payment_status', 'pending').select('id').maybeSingle();

      if (updated && amountNaira > Number(order.total) + 1) {
        await notifyAdmins({
          type: 'transfer_overpaid',
          title: 'Customer sent more than the order total',
          body: `Order ${order.order_number}: total ₦${Number(order.total).toLocaleString()}, received ₦${amountNaira.toLocaleString()}. The extra ₦${(amountNaira - Number(order.total)).toLocaleString()} may need refunding.`,
          audience: 'admins_and_super',
          url: '/admin/orders',
        }).catch(() => {});
      }
    } catch (e) {
      console.error('transfer webhook error:', e);
      return NextResponse.json({ received: false }, { status: 500 }); // Paystack will retry
    }
  }

  return NextResponse.json({ received: true });
}

async function handleRefundEvent(event: any, baseUrl: string) {
  const d = event.data ?? {};
  const txRef: string | undefined = d.transaction_reference ?? d.transaction?.reference;
  if (!txRef) return;

  // Paystack sends the status in data.status; fall back to the event name.
  const status = normalizeRefundStatus(d.status ?? String(event.event).replace('refund.', ''));

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_id, refund_status, refund_amount, stores(name)')
    .eq('payment_reference', txRef)
    .maybeSingle();
  if (!order) return;

  // Never go backwards (e.g. a late "processing" after "processed").
  if (order.refund_status === 'processed') return;

  await supabaseAdmin.from('orders').update({
    refund_status: status,
    refund_error: ['failed', 'needs_attention'].includes(status) ? `Paystack reported: ${d.status ?? event.event}` : null,
    refunded_at: status === 'processed' ? new Date().toISOString() : null,
  }).eq('id', order.id);

  const amount = Number(order.refund_amount ?? 0);

  if (status === 'processed') {
    const title = 'Refund complete';
    const body = `Your refund of ₦${amount.toLocaleString()} for order ${order.order_number} has been sent back to you.`;
    await Promise.allSettled([
      supabaseAdmin.from('notifications').insert({ user_id: order.customer_id, type: 'refund_processed', title, body }),
      sendPushToUser(order.customer_id, { title, body, url: '/orders' }),
      (async () => {
        const { data: cu } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
        const email = cu?.user?.email;
        if (!email) return;
        const { data: cp } = await supabaseAdmin.from('profiles').select('full_name').eq('id', order.customer_id).maybeSingle();
        await sendRefundProcessedEmail(email, (cp as any)?.full_name ?? 'there',
          { orderNumber: order.order_number, amount }, `${baseUrl}/orders`);
      })(),
    ]);
  } else if (status === 'failed' || status === 'needs_attention') {
    await notifyAdmins({
      type: 'refund_failed',
      title: 'Refund needs attention',
      body: `Order ${order.order_number}: Paystack says the ₦${amount.toLocaleString()} refund is "${d.status ?? event.event}". Please refund manually.`,
      audience: 'admins_and_super',
      url: '/admin/orders',
    }).catch(() => {});
  }
}