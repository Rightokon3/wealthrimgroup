import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';
import { getPaystackBalance } from '@/lib/paystackPayouts';

export const dynamic = 'force-dynamic';

const mask = (n?: string | null) => (n ? `****${n.slice(-4)}` : null);

// GET — everything the admin payouts page needs. Admin only. Full account numbers never leave the server.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;

  const [bal, paystack, txs, log, settings] = await Promise.all([
    supabaseAdmin.rpc('admin_wallet_balances'),
    getPaystackBalance(),
    supabaseAdmin.from('wallet_transactions')
      .select('id,user_id,role,type,amount,status,description,created_at')
      .order('created_at', { ascending: false }).limit(60),
    supabaseAdmin.from('admin_payout_log')
      .select('id,admin_email,user_id,role,amount,outcome,note,created_at')
      .order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('wallet_settings').select('key,value').in('key', ['min_withdrawal']),
  ]);
  if (bal.error) return NextResponse.json({ error: bal.error.message }, { status: 500 });

  const rows = ((bal.data ?? []) as any[]).map(r => ({
    user_id: r.user_id as string,
    role: r.role as 'vendor' | 'rider',
    name: r.display_name as string,
    available: Number(r.available),
    pending: Number(r.pending),
    total_earned: Number(r.total_earned),
    total_paid: Number(r.total_paid),
    last_paid_at: r.last_paid_at as string | null,
    bank: r.account_number ? { bank_name: r.bank_name, account_name: r.account_name, account_masked: mask(r.account_number) } : null,
  }));

  const names = new Map(rows.map(r => [r.user_id, r.name]));
  const minWithdrawal = Number((settings.data ?? []).find((s: any) => s.key === 'min_withdrawal')?.value ?? 1000);

  return NextResponse.json({
    paystackBalance: paystack,                                   // null = could not reach Paystack
    minPayout: minWithdrawal,
    vendors: rows.filter(r => r.role === 'vendor').sort((a, b) => b.available - a.available),
    riders: rows.filter(r => r.role === 'rider' && r.available >= 0).sort((a, b) => b.available - a.available),
    owingRiders: rows.filter(r => r.role === 'rider' && r.available < 0).sort((a, b) => a.available - b.available),
    totals: {
      owedToVendors: rows.filter(r => r.role === 'vendor' && r.available > 0).reduce((s, r) => s + r.available, 0),
      owedToRiders: rows.filter(r => r.role === 'rider' && r.available > 0).reduce((s, r) => s + r.available, 0),
      riderCashOwed: -rows.filter(r => r.role === 'rider' && r.available < 0).reduce((s, r) => s + r.available, 0),
    },
    transactions: ((txs.data ?? []) as any[]).map(t => ({ ...t, name: names.get(t.user_id) ?? 'Unknown' })),
    payoutLog: ((log.data ?? []) as any[]).map(t => ({ ...t, name: names.get(t.user_id) ?? 'Unknown' })),
  });
}