'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Landmark, Loader2, AlertCircle, CheckCircle, RefreshCw, ShieldCheck, X, Bike, Store, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Bank { bank_name: string; account_name: string; account_masked: string }
interface Person { user_id: string; role: 'vendor' | 'rider'; name: string; available: number; pending: number; total_earned: number; total_paid: number; last_paid_at: string | null; bank: Bank | null }
interface Tx { id: string; name: string; role: string; type: string; amount: number; status: string; description: string | null; created_at: string }
interface Log { id: string; name: string; admin_email: string; amount: number; outcome: string; note: string | null; created_at: string }
interface Overview {
  paystackBalance: number | null; minPayout: number;
  vendors: Person[]; riders: Person[]; owingRiders: Person[];
  totals: { owedToVendors: number; owedToRiders: number; riderCashOwed: number };
  transactions: Tx[]; payoutLog: Log[];
}

const naira = (n: number) => `${n < 0 ? '-' : ''}₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`;
const when = (d: string) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` };
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vendors' | 'riders' | 'owing' | 'activity'>('vendors');
  const [target, setTarget] = useState<Person | null>(null);
  const [amount, setAmount] = useState('');
  const [key, setKey] = useState('');
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/auth/login?next=/admin/payouts'); return; }
    const res = await fetch('/api/admin/payouts/overview', { headers: await headers(), cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) { router.replace('/auth/login?next=/admin/payouts'); return; }
    if (!res.ok) { setErr(res.status === 403 ? 'You are not allowed to view this page.' : (j.error ?? 'Could not load.')); setLoading(false); return; }
    setData(j); setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function openPay(p: Person) {
    setTarget(p); setAmount(String(Math.max(0, Math.floor(p.available)))); setMsg(null);
    setKey(crypto.randomUUID());   // one key per dialog: a double-click can never pay twice
  }

  async function pay() {
    if (!target) return;
    setPaying(true); setMsg(null);
    const res = await fetch('/api/admin/payouts/pay', {
      method: 'POST', headers: await headers(),
      body: JSON.stringify({ user_id: target.user_id, amount: Math.floor(Number(amount)), key }),
    });
    const j = await res.json().catch(() => ({}));
    setPaying(false);
    if (!res.ok) { setMsg({ ok: false, text: j.error ?? 'Payment failed.' }); return; }
    setTarget(null);
    setMsg({ ok: true, text: j.status === 'success' ? 'Paid. The money has been sent.' : 'Payment sent to the bank. It will show as paid shortly.' });
    load();
  }

  if (loading && !data) return <div className="p-6 text-gray-400">Loading…</div>;
  if (err) return <div className="p-6"><div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-400 rounded-2xl p-5 flex gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0" />{err}</div></div>;
  if (!data) return null;

  const list = tab === 'vendors' ? data.vendors : tab === 'riders' ? data.riders : data.owingRiders;
  const amt = Math.floor(Number(amount));
  const lowPaystack = data.paystackBalance !== null && target && amt > data.paystackBalance;

  return (
    <div className="text-gray-100">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <button onClick={() => router.push('/admin')} className="text-xs font-bold text-gray-400 flex items-center gap-1 mb-1"><ArrowLeft className="w-3 h-3" /> Admin</button>
            <h1 className="text-2xl font-black text-white flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-orange-500" /> Payouts</h1>
          </div>
          <button onClick={load} className="p-2 rounded-xl bg-gray-900 border border-gray-700"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>

        {msg && (
          <div className={`flex gap-3 p-4 rounded-2xl border text-sm font-medium ${msg.ok ? 'bg-green-950 border-green-800 text-green-300' : 'bg-red-950 border-red-800 text-red-400'}`}>
            {msg.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}{msg.text}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Paystack balance', value: data.paystackBalance === null ? 'Unavailable' : naira(data.paystackBalance), icon: Wallet },
            { label: 'Owed to vendors', value: naira(data.totals.owedToVendors), icon: Store },
            { label: 'Owed to riders', value: naira(data.totals.owedToRiders), icon: Bike },
            { label: 'Riders owe Drovo (cash)', value: naira(data.totals.riderCashOwed), icon: Landmark },
          ].map(c => (
            <div key={c.label} className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm p-4">
              <c.icon className="w-4 h-4 text-orange-500 mb-2" />
              <div className="text-xl font-black text-white">{c.value}</div>
              <div className="text-[11px] text-gray-400 font-medium">{c.label}</div>
            </div>
          ))}
        </div>
        {data.paystackBalance !== null && data.paystackBalance < data.totals.owedToVendors + data.totals.owedToRiders && (
          <div className="text-sm text-amber-300 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">Your Paystack balance is lower than what you owe. Top it up before paying everyone.</div>
        )}

        <div className="flex gap-2 overflow-x-auto">
          {([['vendors', `Vendors (${data.vendors.length})`], ['riders', `Riders (${data.riders.length})`], ['owing', `Riders owing cash (${data.owingRiders.length})`], ['activity', 'Recent activity']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${tab === k ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-700 text-gray-300'}`}>{l}</button>
          ))}
        </div>

        {tab !== 'activity' ? (
          <div className="space-y-3">
            {list.length === 0 && <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-400 text-sm">Nobody here yet.</div>}
            {list.map(p => (
              <div key={p.user_id} className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.bank ? `${p.bank.account_name} · ${p.bank.bank_name} · ${p.bank.account_masked}` : <span className="text-amber-600 font-bold">No bank account added</span>}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Earned {naira(p.total_earned)} · Paid {naira(p.total_paid)} · Pending {naira(p.pending)}{p.last_paid_at ? ` · Last paid ${when(p.last_paid_at)}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-lg font-black ${p.available < 0 ? 'text-red-400' : 'text-white'}`}>{naira(Math.abs(p.available))}</div>
                    <div className="text-[11px] text-gray-400">{p.available < 0 ? 'owes Drovo' : 'to pay'}</div>
                  </div>
                  {p.available > 0 && (
                    <button onClick={() => openPay(p)} disabled={!p.bank || p.available < data.minPayout}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-black disabled:opacity-40">Pay</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm divide-y divide-gray-800">
              <div className="p-4 font-black text-white">Recent transactions</div>
              {data.transactions.map(t => (
                <div key={t.id} className="p-4 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{t.name} <span className="text-gray-400 font-medium">· {t.role}</span></div>
                    <div className="text-xs text-gray-400 truncate">{t.description ?? t.type.replace(/_/g, ' ')} · {when(t.created_at)}</div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">{t.status}</span>
                  <div className={`font-black ${t.amount >= 0 ? 'text-green-600' : 'text-white'}`}>{t.amount >= 0 ? '+' : ''}{naira(t.amount)}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm divide-y divide-gray-800">
              <div className="p-4 font-black text-white">Payout audit log</div>
              {data.payoutLog.length === 0 && <div className="p-4 text-sm text-gray-400">No payouts yet.</div>}
              {data.payoutLog.map(l => (
                <div key={l.id} className="p-4 text-sm flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{naira(l.amount)} to {l.name}</div>
                    <div className="text-xs text-gray-400 truncate">by {l.admin_email} · {when(l.created_at)}{l.note ? ` · ${l.note}` : ''}</div>
                  </div>
                  <span className={`text-[11px] font-bold ${l.outcome === 'failed' ? 'text-red-400' : 'text-green-600'}`}>{l.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {target && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-lg text-white">Pay {target.name}</h3>
                <p className="text-xs text-gray-500">{target.bank?.account_name} · {target.bank?.bank_name} · {target.bank?.account_masked}</p>
              </div>
              <button onClick={() => !paying && setTarget(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Amount (₦) — owed {naira(target.available)}</label>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white text-lg font-black focus:border-orange-400 outline-none" />
            </div>
            {amt > target.available && <p className="text-sm text-red-400">That is more than they are owed.</p>}
            {lowPaystack && <p className="text-sm text-red-400">Not enough in Paystack ({naira(data.paystackBalance!)}).</p>}
            {msg && !msg.ok && <p className="text-sm text-red-400 flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{msg.text}</p>}
            <p className="text-xs text-gray-400">This sends real money from your Paystack balance and cannot be undone.</p>
            <button onClick={pay} disabled={paying || !amt || amt > target.available || amt < data.minPayout || !!lowPaystack}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40">
              {paying && <Loader2 className="w-4 h-4 animate-spin" />} Send {naira(amt || 0)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}