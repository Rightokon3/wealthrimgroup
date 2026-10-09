// Server-only helpers for Paystack refunds. Never import this into a 'use client' file:
// it uses PAYSTACK_SECRET_KEY.

const PAYSTACK_API = 'https://api.paystack.co';

export type RefundStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'needs_attention';

/** Turns Paystack's wording ("needs-attention", "processed", ...) into the values we store. */
export function normalizeRefundStatus(s?: string | null): RefundStatus {
  const v = (s ?? '').toLowerCase().replace(/_/g, '-');
  if (v === 'processed')       return 'processed';
  if (v === 'processing')      return 'processing';
  if (v === 'failed')          return 'failed';
  if (v === 'needs-attention') return 'needs_attention';
  return 'pending';
}

export interface RefundResult {
  ok: boolean;
  status?: RefundStatus;
  refundId?: string;
  error?: string;
}

/**
 * Refunds a payment IN FULL, back to wherever it came from
 * (the same card, or the bank account that sent the transfer).
 * `transaction` is the Paystack payment reference saved on the order.
 * Leaving out `amount` makes Paystack refund the whole payment.
 */
export async function createPaystackRefund(opts: { transaction: string; reason?: string }): Promise<RefundResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: false, error: 'PAYSTACK_SECRET_KEY is not set on the server.' };

  try {
    const res = await fetch(`${PAYSTACK_API}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction:   opts.transaction,
        customer_note: 'Your Drovo order was cancelled',
        merchant_note: opts.reason ? `Order cancelled: ${opts.reason}` : 'Order cancelled',
      }),
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.status) {
      return { ok: false, error: json?.message ?? `Paystack returned an error (${res.status}).` };
    }
    return {
      ok: true,
      status: normalizeRefundStatus(json.data?.status),
      refundId: json.data?.id != null ? String(json.data.id) : undefined,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Could not reach Paystack.' };
  }
}