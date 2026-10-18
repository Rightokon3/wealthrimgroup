import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';
import { getWalletRole } from '@/lib/walletRole';
import { sendTransfer, getPaystackBalance, verifyTransfer } from '@/lib/paystackPayouts';
import { markPaid, markFailed, applyTransferState } from '@/lib/payoutSettle';

// POST { user_id, amount, key }  — the Drovo admin pays a vendor or rider from the Paystack balance.
//
// Built so a bad network can never lose or double-send money:
//  - the money is locked in the wallet first (status "processing")
//  - every Paystack call has a time limit
//  - if the network fails we do NOT call it failed: we ask Paystack what really happened (verify)
//  - the same key can be sent again safely: it resumes the same payment, it never starts a second one
//  - anything still unclear is settled later by the reconcile job; Paystack's webhook helps too
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

  const getRow = async () => (await supabaseAdmin.from('wallet_transactions')
    .select('user_id, amount, status, created_at').eq('reference', reference).maybeSingle()).data as any;

  // The user can retry with the same key after a network problem. Is this payment already underway?
  let row = await getRow();

  if (row) {
    if (row.user_id !== userId || Math.abs(Number(row.amount)) !== amt) {
      return NextResponse.json({ error: 'This payment key was already used for something else.' }, { status: 409 });
    }
    if (row.status === 'paid') return NextResponse.json({ success: true, status: 'success', note: 'Already sent.' });
    if (row.status === 'failed') {
      return NextResponse.json({ error: 'That attempt failed. Close this window and start again.', startNew: true }, { status: 409 });
    }
  } else {
    // Is there enough money in Paystack?
    const ps = await getPaystackBalance();
    if (ps === null) return NextResponse.json({ error: 'Could not reach Paystack (network). Nothing was sent. Try again.' }, { status: 502 });
    if (ps < amt) return NextResponse.json({ error: `Paystack balance is only ₦${ps.toLocaleString()}. Top it up first.`, startNew: false }, { status: 400 });

    // Lock the money in the wallet (checks minimum, bank account, balance)
    const { data: result, error } = await supabaseAdmin.rpc('request_withdrawal', {
      p_user: userId, p_role: role, p_amount: amt, p_reference: reference,
    });
    if (error) {
      row = await getRow();   // the lock may have succeeded even though the reply was lost
      if (!row) return NextResponse.json({ error: 'Could not start the payment. Nothing was sent. Try again.' }, { status: 500 });
    } else {
      const messages: Record<string, string> = {
        below_min: 'That is below the minimum payout.',
        no_account: 'This person has not added a bank account yet.',
        insufficient: 'That is more than they are owed.',
      };
      if (result !== 'ok') return NextResponse.json({ error: messages[result as string] ?? 'Could not pay.' }, { status: 400 });
      await log('started');
    }
  }

  // ── From here the money is locked. Find out what Paystack knows. ──
  const pending = (note: string) => NextResponse.json({ success: true, status: 'pending', note }, { status: 202 });
  const unsure = () => NextResponse.json({
    success: false, unsure: true,
    error: 'The network is unstable, so we could not confirm this payment. The money is safe: it is either on its way or it will be returned automatically. It is safe to press Send again, or check Recent activity in a minute.',
  }, { status: 202 });

  const settle = async (): Promise<NextResponse | null> => {
    const state = await verifyTransfer(reference);
    if (state === 'not_found') return null;                       // Paystack never received it: we may send now
    if (state === 'unknown') return unsure();                     // cannot tell: do nothing risky
    const out = await applyTransferState(reference, state, 0);
    if (out === 'paid') { await log('paid'); return NextResponse.json({ success: true, status: 'success' }); }
    if (out === 'failed') { await log('failed', 'Paystack reported failure'); return NextResponse.json({ error: 'The bank rejected this transfer. The money is back in their wallet.', startNew: true }, { status: 502 }); }
    return pending('The bank is processing it.');
  };

  const early = await settle();
  if (early) return early;

  // Paystack has not seen this reference yet: send it now.
  const { data: acct } = await supabaseAdmin.from('payout_accounts').select('recipient_code').eq('user_id', userId).single();
  const t = await sendTransfer({ amountNaira: amt, recipient: acct!.recipient_code, reference, reason: 'Drovo payout' });

  if (t.unknown) {
    await log('unconfirmed', t.message ?? 'network');
    const after = await settle();
    return after ?? unsure();
  }

  const failNow = async (text: string, status = 502) => {
    await markFailed(reference, text);
    await log('failed', text);
    return NextResponse.json({ error: text, startNew: true }, { status });
  };

  if (!t.ok || t.status === 'failed') {
    // "already exists" means an earlier try did reach Paystack: ask it what happened rather than failing
    if (/reference/i.test(t.message ?? '') && /exist|used|duplicate/i.test(t.message ?? '')) {
      const again = await settle();
      if (again) return again;
    }
    return failNow(t.message ?? 'Paystack rejected the transfer.');
  }
  if (t.status === 'otp') {
    console.error('[admin pay] Paystack asked for an OTP. Turn off "Confirm transfers before sending" in Paystack Settings > Preferences.');
    return failNow('Paystack wants a confirmation code. Turn off "Confirm transfers before sending" in Paystack settings.', 503);
  }

  if (t.status === 'success') {
    await markPaid(reference);
    await log('paid');
    return NextResponse.json({ success: true, status: 'success' });
  }
  return pending('Sent to the bank. It will show as paid shortly.');
}