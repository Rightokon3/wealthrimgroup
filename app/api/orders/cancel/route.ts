import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPushToUser } from '@/lib/web-push-server';
import { notifyAdmins } from '@/lib/notify-admins';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { createPaystackRefund } from '@/lib/paystackRefund';
import { sendOrderCancelledEmail } from '@/lib/mailer';



const VENDOR_CAN_CANCEL   = ['pending', 'confirmed', 'preparing', 'ready'];
const CUSTOMER_CAN_CANCEL = ['pending', 'confirmed'];
const ADMIN_CAN_CANCEL    = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'];

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const { data: au } = await supabaseAdmin.auth.getUser(token);
    const caller = au?.user;
    if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const { orderId, reason } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, stores(name, vendor_id)')
      .eq('id', orderId)
      .single();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const store = order.stores as any;

    // Who is calling?
    const { data: prof } = await supabaseAdmin.from('profiles').select('role, full_name').eq('id', caller.id).maybeSingle();
    const isAdmin    = (prof as any)?.role === 'admin';
    const isVendor   = store?.vendor_id === caller.id;
    const isCustomer = order.customer_id === caller.id;
    const cancelledBy = isAdmin ? 'admin' : isVendor ? 'vendor' : isCustomer ? 'customer' : null;
    if (!cancelledBy) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });

    // Already cancelled: return what we have (no second refund, ever).
    if (order.status === 'cancelled') {
      return NextResponse.json({ success: true, alreadyCancelled: true, refund_status: order.refund_status });
    }

    const allowed = cancelledBy === 'admin' ? ADMIN_CAN_CANCEL : cancelledBy === 'vendor' ? VENDOR_CAN_CANCEL : CUSTOMER_CAN_CANCEL;
    if (!allowed.includes(order.status)) {
      return NextResponse.json({ error: `An order that is "${order.status}" can no longer be cancelled here.` }, { status: 409 });
    }

    const paidOnline = order.payment_status === 'paid' && order.payment_method !== 'cash_on_delivery';
    const cleanReason = (typeof reason === 'string' && reason.trim()) ? reason.trim().slice(0, 300) : null;
    const amount = paidOnline ? Number(order.total) : null;

    // Atomic claim: only ONE request can flip the order to cancelled.
    const { data: claimed } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancel_reason: cleanReason,
        refund_status: paidOnline ? 'pending' : null,
        refund_amount: amount,
      })
      .eq('id', orderId)
      .eq('status', order.status)
      .select('id')
      .maybeSingle();
    if (!claimed) return NextResponse.json({ success: true, alreadyCancelled: true });

    // Refund (card path via Paystack; needs the saved transaction reference).
    let refundStatus: string | null = null;
    if (paidOnline) {
      if (!order.payment_reference) {
        refundStatus = 'needs_attention';
        await supabaseAdmin.from('orders').update({
          refund_status: refundStatus,
          refund_error: 'No Paystack reference saved on this order. Refund manually.',
        }).eq('id', orderId);
      } else {
        const r = await createPaystackRefund({
          transaction: order.payment_reference,
          reason: cleanReason ?? `Order ${order.order_number} cancelled by ${cancelledBy}`,
        });
        refundStatus = r.ok ? (r.status ?? 'pending') : 'failed';
        await supabaseAdmin.from('orders').update({
          refund_status: refundStatus,
          refund_reference: r.refundId ? String(r.refundId) : null,
          refund_error: r.ok ? null : (r.error ?? 'Refund request failed'),
          refunded_at: refundStatus === 'processed' ? new Date().toISOString() : null,
        }).eq('id', orderId);
        if (!r.ok) {
          await notifyAdmins({
            type: 'refund_failed',
            title: 'Refund needs attention',
            body: `Order ${order.order_number}: refund of ₦${Number(order.total).toLocaleString()} failed (${r.error}). Please refund manually.`,
            audience: 'admins_and_super',
            url: '/admin/orders',
          }).catch(() => {});
        }
      }
    }

    // Tell the customer: in-app + push + email.
    const money = amount != null ? `₦${amount.toLocaleString()}` : '';
    const who = cancelledBy === 'customer' ? 'You cancelled' : 'Sorry, your order was cancelled';
    const msg = !paidOnline
      ? `${who}${cancelledBy === 'customer' ? ' your order' : ''} ${order.order_number}. You were not charged.`
      : ['failed', 'needs_attention'].includes(refundStatus ?? '')
        ? `Your order ${order.order_number} has been cancelled. Your ${money} refund is being arranged by our team.`
        : `Your order ${order.order_number} has been cancelled and we have refunded ${money} back to you (including delivery). It can take a few working days to show.`;
    const title = 'Order cancelled' + (paidOnline ? ' & refunded' : '');

    await Promise.allSettled([
      supabaseAdmin.from('notifications').insert({ user_id: order.customer_id, type: 'order_cancelled', title, body: msg }),
      sendPushToUser(order.customer_id, { title, body: msg, url: '/orders' }),
      (async () => {
        const { data: cu } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
        const email = cu?.user?.email;
        if (!email) return;
        const { data: cp } = await supabaseAdmin.from('profiles').select('full_name').eq('id', order.customer_id).maybeSingle();
        await sendOrderCancelledEmail(email, (cp as any)?.full_name ?? 'there', {
          orderNumber: order.order_number,
          storeName: store?.name ?? 'the store',
          reason: cleanReason,
          refundAmount: amount,
          refundStatus,
          cancelledBy,
        }, `${getBaseUrl(req)}/orders`);
      })(),
      // Tell the vendor if someone else cancelled.
      cancelledBy !== 'vendor' && store?.vendor_id
        ? Promise.all([
            supabaseAdmin.from('notifications').insert({
              user_id: store.vendor_id, type: 'order_cancelled', title: 'Order cancelled',
              body: `Order ${order.order_number} was cancelled by the ${cancelledBy}.`,
            }),
            sendPushToUser(store.vendor_id, { title: 'Order cancelled', body: `Order ${order.order_number} was cancelled.`, url: '/vendor/dashboard' }),
          ])
        : Promise.resolve(),
    ]);

    return NextResponse.json({ success: true, refund_status: refundStatus, refund_amount: amount });
  } catch (err: any) {
    console.error('cancel order error:', err);
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}