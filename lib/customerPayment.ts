import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Called by BOTH /api/verify-payment and the Paystack webhook (charge.success).
 * Safe to call many times for the same reference.
 *  - no order yet           -> 'no_order' (the checkout page will create it; webhook retries later)
 *  - paid >= order total    -> marks the order paid
 *  - paid <  order total    -> marks 'underpaid' (never 'paid')
 */
export async function settleCustomerPayment(reference: string, paidNaira: number) {
  const { data: order } = await supabaseAdmin
    .from('orders').select('*').eq('payment_reference', reference).maybeSingle();
  if (!order) return { result: 'no_order' as const };

  const total = Number(order.total ?? order.total_amount ?? 0);
  if (order.payment_status === 'paid' && order.payment_verified_at) return { result: 'already_paid' as const };

  // 1 naira tolerance for rounding
  if (paidNaira + 1 < total) {
    await supabaseAdmin.from('orders')
      .update({ payment_status: 'underpaid', paid_amount: paidNaira }).eq('id', order.id);
    return { result: 'underpaid' as const, total, paidNaira };
  }
  await supabaseAdmin.from('orders').update({
    payment_status: 'paid', paid_amount: paidNaira, payment_verified_at: new Date().toISOString(),
  }).eq('id', order.id);
  return { result: 'paid' as const };
}