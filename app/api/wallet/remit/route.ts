import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { getBaseUrl } from '@/lib/getBaseUrl';
import { initializePayment } from '@/lib/paystackPayouts';

// Rider pays back the cash they collected (cash-on-delivery) through Paystack (bank transfer or card).
// POST { amount? }  — defaults to everything owed. The webhook credits the wallet when the money arrives.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  const { data: rider } = await supabaseAdmin.from('riders').select('id').eq('user_id', user.id).maybeSingle();
  if (!rider) return NextResponse.json({ error: 'Only riders can do this.' }, { status: 403 });

  const { data: rows } = await supabaseAdmin
    .from('wallet_transactions').select('amount')
    .eq('user_id', user.id).in('status', ['available', 'processing', 'paid']);
  const balance = (rows ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const owed = balance < 0 ? Math.ceil(-balance) : 0;
  if (owed <= 0) return NextResponse.json({ error: 'You do not owe anything right now.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const requested = Math.floor(Number(body.amount ?? owed));
  const amount = Math.min(Math.max(requested, 100), owed);

  try {
    const url = await initializePayment({
      email: user.email!,
      amountNaira: amount,
      reference: `REMIT-${crypto.randomUUID()}`,
      callbackUrl: `${getBaseUrl(req)}/rider/earnings?paid=1`,
      metadata: { type: 'rider_remit', user_id: user.id },
    });
    return NextResponse.json({ url, amount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Could not start the payment' }, { status: 502 });
  }
}