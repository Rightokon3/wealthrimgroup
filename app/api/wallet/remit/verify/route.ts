import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp, tooMany } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { verifyTransaction } from '@/lib/paystackPayouts';

// POST { reference } — called when a rider comes back from the Paystack page.
// If Paystack's webhook was late or lost (bad network), this still credits the payment, exactly once.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  const w = await rateLimit(`remit-verify:${user.id}`, 30, 60);
  if (w) return tooMany(w);

  const { reference } = await req.json().catch(() => ({}));
  if (typeof reference !== 'string' || !/^REMIT-[0-9a-f-]{36}$/i.test(reference)) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const v = await verifyTransaction(reference);
  if (v.state === 'unknown') return NextResponse.json({ state: 'unknown', message: 'Could not confirm yet (network). Your payment is safe; this page will update.' }, { status: 202 });
  if (v.state === 'pending') return NextResponse.json({ state: 'pending', message: 'Payment not confirmed yet.' }, { status: 202 });
  if (v.state === 'failed') return NextResponse.json({ state: 'failed', message: 'This payment was not completed.' });

  // Only the rider who started this payment can claim it
  if (v.metadata?.type !== 'rider_remit' || v.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: 'This payment does not belong to you.' }, { status: 403 });
  }

  // The unique reference means the webhook and this call can never both credit it
  const { error } = await supabaseAdmin.from('wallet_transactions').insert({
    user_id: user.id, role: 'rider', type: 'remittance', amount: v.amountNaira,
    status: 'available', description: 'Cash paid back to Drovo', reference,
  });
  const already = !!error && /duplicate|unique/i.test(error.message);
  if (error && !already) return NextResponse.json({ error: 'Could not record the payment. Contact support with your payment reference.' }, { status: 500 });
  return NextResponse.json({ state: 'success', amount: v.amountNaira, already });
}