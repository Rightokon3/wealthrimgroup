import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyTransfer, TransferState } from '@/lib/paystackPayouts';

// Shared by the admin pay route, the reconcile route and the cron job.
// Rule: a payout is only called FAILED when Paystack says it failed (or never heard of it for 10+ minutes).
// A network problem is never treated as a failure, because the money may really have left.

const naira = (n: number) => `₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`;

export async function markPaid(reference: string) {
  const { data } = await supabaseAdmin.from('wallet_transactions')
    .update({ status: 'paid' }).eq('reference', reference).neq('status', 'paid')
    .select('user_id, amount').maybeSingle();
  if (data) {
    await supabaseAdmin.from('notifications').insert({
      user_id: data.user_id, type: 'payout_sent', title: 'You have been paid',
      body: `Drovo sent ${naira(Number(data.amount))} to your bank account.`,
    });
  }
}

export async function markFailed(reference: string, reason: string) {
  // only a payment that is still waiting can be failed; a settled one is left alone
  const { data } = await supabaseAdmin.from('wallet_transactions')
    .update({ status: 'failed', description: `Payment failed: ${reason}. Money is back in your wallet.` })
    .eq('reference', reference).eq('status', 'processing')
    .select('user_id, amount').maybeSingle();
  if (data) {
    await supabaseAdmin.from('notifications').insert({
      user_id: data.user_id, type: 'withdrawal_failed', title: 'Payment failed',
      body: `Your payment of ${naira(Number(data.amount))} could not be completed. The money is back in your wallet.`,
    });
  }
}

/** Applies Paystack's answer to our record. Returns what happened. */
export async function applyTransferState(reference: string, state: TransferState, ageMinutes: number): Promise<'paid' | 'failed' | 'waiting'> {
  if (state === 'success') { await markPaid(reference); return 'paid'; }
  if (state === 'failed' || state === 'reversed') { await markFailed(reference, state === 'reversed' ? 'transfer reversed' : 'bank rejected it'); return 'failed'; }
  if (state === 'not_found' && ageMinutes >= 10) { await markFailed(reference, 'it never reached the bank'); return 'failed'; }
  return 'waiting';
}

/** Checks every payout that has been "processing" for a while and settles the ones Paystack has an answer for. */
export async function reconcilePayouts(opts: { olderThanMinutes?: number; limit?: number } = {}) {
  const older = opts.olderThanMinutes ?? 2;
  const cutoff = new Date(Date.now() - older * 60_000).toISOString();
  const { data: rows } = await supabaseAdmin.from('wallet_transactions')
    .select('reference, created_at')
    .eq('type', 'withdrawal').eq('status', 'processing').lt('created_at', cutoff)
    .order('created_at').limit(opts.limit ?? 20);

  const result = { checked: 0, paid: 0, failed: 0, waiting: 0 };
  for (const r of rows ?? []) {
    if (!r.reference) continue;
    result.checked++;
    const state = await verifyTransfer(r.reference);
    const age = (Date.now() - new Date(r.created_at).getTime()) / 60_000;
    const out = await applyTransferState(r.reference, state, age);
    result[out]++;
  }
  return result;
}