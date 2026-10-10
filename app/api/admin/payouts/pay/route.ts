import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';
import { getWalletRole } from '@/lib/walletRole';
import { sendTransfer, getPaystackBalance } from '@/lib/paystackPayouts';

// POST { user_id, amount, key }  — the Drovo admin pays a vendor or rider from the Paystack balance.
// Safety layers: admin-only (3 checks), amount re-checked against the wallet inside the database under a lock,
// Paystack balance checked first, unique reference per click (double-clicks cannot pay twice),
// failures put the money straight back, and every attempt is written to admin_payout_log.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;
  const admin = auth.user;

  const body = await req.json().catch(() => ({}));
  const userId = String(body.user_id ?? '');
  const key = String(body.key ?? '');
  const amt = Math.floor(Number(body.amount));
  if (!UUID.test(userId) || !UUID.test(key)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });

  const role = await getWalletRole(userId);
  if (!role) return NextResponse.json({ error: 'That user is not a vendor or rider.' }, { status: 400 });

  const reference = `PAY-${key}`;
  const log = (outcome: string, note?: string) =>
    supabaseAdmin.from('admin_payout_log').insert({
      admin_id: admin.id, admin_email: admin.email, user_id: userId, role, amount: amt, reference, outcome, note: note ?? null,
    });

  // Is there enough money in Paystack?
  const ps = await getPaystackBalance();
  if (ps === null) return NextResponse.json({ error: 'Could not check the Paystack balance. Try again.' }, { status: 502 });
  if (ps < amt) return NextResponse.json({ error: `Paystack balance is only ₦${ps.toLocaleString()}. Top it up first.` }, { status: 400 });

  // Lock the money in the wallet (checks minimum, bank account, balance)
  const { data: result, error } = await supabaseAdmin.rpc('request_withdrawal', {
    p_user: userId, p_role: role, p_amount: amt, p_reference: reference,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: 'This payment was already submitted.' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const messages: Record<string, string> = {
    below_min: 'That is below the minimum payout.',
    no_account: 'This person has not added a bank account yet.',
    insufficient: 'That is more than they are owed.',
  };
  if (result !== 'ok') return NextResponse.json({ error: messages[result as string] ?? 'Could not pay.' }, { status: 400 });

  await log('started');

  const { data: acct } = await supabaseAdmin.from('payout_accounts').select('recipient_code').eq('user_id', userId).single();
  const t = await sendTransfer({ amountNaira: amt, recipient: acct!.recipient_code, reference, reason: 'Drovo payout' });

  const fail = async (text: string, status = 502) => {
    await supabaseAdmin.from('wallet_transactions').update({ status: 'failed', description: `Payment failed: ${text}` }).eq('reference', reference);
    await log('failed', text);
    return NextResponse.json({ error: text }, { status });
  };

  if (!t.ok || t.status === 'failed') return fail(t.message ?? 'Paystack rejected the transfer.');
  if (t.status === 'otp') {
    console.error('[admin pay] Paystack asked for an OTP. Turn off "Confirm transfers before sending" in Paystack Settings > Preferences.');
    return fail('Paystack wants a confirmation code. Turn off "Confirm transfers before sending" in Paystack settings.', 503);
  }

  if (t.status === 'success') {
    await supabaseAdmin.from('wallet_transactions').update({ status: 'paid' }).eq('reference', reference);
    await supabaseAdmin.from('notifications').insert({
      user_id: userId, type: 'payout_sent', title: 'You have been paid',
      body: `Drovo sent ₦${amt.toLocaleString()} to your bank account.`,
    });
  }
  // 'pending': the webhook (transfer.success / transfer.failed) settles it and notifies them.
  return NextResponse.json({ success: true, status: t.status });
}