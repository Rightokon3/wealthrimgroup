import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { getWalletRole } from '@/lib/walletRole';
import { sendTransfer } from '@/lib/paystackPayouts';

// POST { amount }  — the vendor / rider chooses when to be paid.
// The money leaves the wallet first (locked in the database), then Paystack sends it.
// If Paystack refuses, the withdrawal is marked failed and the balance comes straight back.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  const role = await getWalletRole(user.id);
  if (!role) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { amount } = await req.json();
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });

  const reference = `WD-${crypto.randomUUID()}`;
  const { data: result, error } = await supabaseAdmin.rpc('request_withdrawal', {
    p_user: user.id, p_role: role, p_amount: amt, p_reference: reference,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages: Record<string, string> = {
    below_min: 'That is below the minimum withdrawal.',
    no_account: 'Add your bank account first.',
    insufficient: 'You do not have that much available.',
  };
  if (result !== 'ok') return NextResponse.json({ error: messages[result as string] ?? 'Could not withdraw.' }, { status: 400 });

  const { data: acct } = await supabaseAdmin.from('payout_accounts').select('recipient_code').eq('user_id', user.id).single();

  const t = await sendTransfer({
    amountNaira: amt, recipient: acct!.recipient_code, reference, reason: 'Drovo payout',
  });

  if (!t.ok || t.status === 'failed') {
    await supabaseAdmin.from('wallet_transactions').update({ status: 'failed', description: `Withdrawal failed: ${t.message ?? 'rejected'}` }).eq('reference', reference);
    return NextResponse.json({ error: t.message ?? 'The transfer could not be started. Your balance was not changed.' }, { status: 502 });
  }

  if (t.status === 'otp') {
    // Paystack is waiting for an approval code; nothing was sent.
    await supabaseAdmin.from('wallet_transactions').update({ status: 'failed', description: 'Withdrawal failed: transfer needs approval' }).eq('reference', reference);
    console.error('[withdraw] Paystack asked for an OTP. Turn off "Confirm transfers before sending" in Paystack Settings > Preferences.');
    return NextResponse.json({ error: 'Payouts are temporarily unavailable. Please contact support.' }, { status: 503 });
  }

  // 'success' or 'pending': the webhook (transfer.success / transfer.failed) settles it.
  if (t.status === 'success') {
    await supabaseAdmin.from('wallet_transactions').update({ status: 'paid' }).eq('reference', reference);
  }
  return NextResponse.json({ success: true, status: t.status });
}