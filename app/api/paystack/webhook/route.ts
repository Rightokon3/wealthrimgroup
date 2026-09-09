
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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

  if (event.event === 'charge.success' && event.data?.channel === 'dedicated_nuban') {
    const customerCode = event.data.customer?.customer_code;
    const amountNaira = event.data.amount / 100;
    const paystackReference = event.data.reference;

    if (!customerCode) return NextResponse.json({ received: true });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('paystack_customer_code', customerCode)
      .single();

    if (!profile) return NextResponse.json({ received: true });

    // Oldest matching pending transfer order for this customer at this amount.
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('customer_id', profile.id)
      .eq('payment_method', 'transfer')
      .eq('payment_status', 'pending')
      .eq('total', amountNaira)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (order) {
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid', payment_reference: paystackReference })
        .eq('id', order.id);
    }
    // If no match found, it's logged in Paystack's dashboard for manual reconciliation —
    // consider also inserting into a `unmatched_transfers` table here for your own safety net.
  }

  return NextResponse.json({ received: true });
}