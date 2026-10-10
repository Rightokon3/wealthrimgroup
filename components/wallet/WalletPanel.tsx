'use client';
import { useEffect, useState, useCallback } from 'react';
import { Wallet, Clock, Landmark, ArrowDownToLine, Loader2, CheckCircle, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { candidateBanks } from '@/lib/nuban';

type Role = 'vendor' | 'rider';
interface Tx { id: string; type: string; amount: number; status: string; description: string | null; created_at: string }
interface Account { bank_name: string; account_number: string; account_name: string }

const naira = (n: number) => `${n < 0 ? '-' : ''}₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:    { text: 'Pending',    cls: 'bg-amber-100 text-amber-700' },
  available:  { text: 'Available',  cls: 'bg-green-100 text-green-700' },
  processing: { text: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  paid:       { text: 'Paid out',   cls: 'bg-gray-100 text-gray-600' },
  failed:     { text: 'Failed',     cls: 'bg-red-100 text-red-700' },
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` };
}

export default function WalletPanel({ role, userId }: { role: Role; userId: string }) {
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [earned, setEarned] = useState(0);
  const [paidOut, setPaidOut] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  // bank form
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [acctNo, setAcctNo] = useState('');
  const [acctName, setAcctName] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankErr, setBankErr] = useState('');

  // pay back (riders)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [sum, list, acct] = await Promise.all([
      supabase.rpc('wallet_summary'),
      supabase.from('wallet_transactions').select('id,type,amount,status,description,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('payout_accounts').select('bank_name,account_number,account_name').eq('user_id', userId).maybeSingle(),
    ]);
    const s = (sum.data ?? {}) as any;
    setAvailable(Number(s.available ?? 0));
    setPending(Number(s.pending ?? 0));
    setEarned(Number(s.earned ?? 0));
    setPaidOut(Number(s.paid_out ?? 0));
    setTxs((list.data ?? []) as Tx[]);
    setAccount((acct.data ?? null) as Account | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Refresh when a payout / payment lands
  useEffect(() => {
    const ch = supabase.channel(`wallet-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  async function openBankForm() {
    setEditing(true); setBankErr(''); setAcctName('');
    if (banks.length === 0) {
      const res = await fetch('/api/payout/banks', { headers: await authHeaders() });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setBanks(j.banks); else setBankErr(j.error ?? 'Could not load banks.');
    }
  }

  // A new number means a new list of likely banks
  useEffect(() => { setBankCode(''); setShowAllBanks(false); }, [acctNo]);

  // Check the account as soon as the user taps a bank (one lookup per tap)
  useEffect(() => {
    setAcctName('');
    if (!editing || !bankCode || !/^\d{10}$/.test(acctNo)) return;
    let stop = false;
    (async () => {
      setChecking(true); setBankErr('');
      const res = await fetch('/api/payout/account', {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ action: 'resolve', bank_code: bankCode, account_number: acctNo }),
      });
      const j = await res.json().catch(() => ({}));
      if (stop) return;
      setChecking(false);
      if (res.ok) setAcctName(j.account_name); else setBankErr(j.error ?? 'Could not check this account.');
    })();
    return () => { stop = true; };
  }, [bankCode, acctNo, editing]);

  async function saveAccount() {
    setSaving(true); setBankErr('');
    const res = await fetch('/api/payout/account', {
      method: 'POST', headers: await authHeaders(),
      body: JSON.stringify({ action: 'save', bank_code: bankCode, account_number: acctNo }),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setBankErr(j.error ?? 'Could not save.'); return; }
    setEditing(false); setAcctNo(''); setBankCode('');
    await load();
  }

  async function payBack() {
    setMsg(null); setBusy(true);
    const res = await fetch('/api/wallet/remit', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({}) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: j.error ?? 'Could not start the payment.' }); return; }
    window.location.href = j.url;
  }

  const owed = available < 0 ? Math.ceil(-available) : 0;

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl h-28 border border-gray-100" />)}</div>;

  return (
    <div className="space-y-5">
      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white mb-3"><Wallet className="w-4 h-4" /></div>
          <div className={`text-2xl font-black ${available < 0 ? 'text-red-600' : 'text-gray-900'}`}>{naira(available)}</div>
          <div className="text-xs text-gray-400 font-medium mt-0.5">{available < 0 ? 'You owe Drovo' : 'Waiting to be paid by Drovo'}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mb-3"><Clock className="w-4 h-4" /></div>
          <div className="text-2xl font-black text-gray-900">{naira(pending)}</div>
          <div className="text-xs text-gray-400 font-medium mt-0.5">Pending (waiting for the customer to confirm)</div>
        </div>
      </div>

      {msg && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium ${msg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {msg.ok ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Rider owes cash */}
      {role === 'rider' && owed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-black text-red-700 mb-1">Pay back cash you collected</h3>
          <p className="text-sm text-red-600 mb-4">
            You collected cash on delivery orders and owe Drovo <b>{naira(owed)}</b>. Pay by bank transfer or card. Your balance updates as soon as the payment arrives.
          </p>
          <button onClick={payBack} disabled={busy}
            className="w-full py-3 bg-red-600 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Pay {naira(owed)} now
          </button>
        </div>
      )}

      {/* Paid by Drovo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-gray-900 mb-1 flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-orange-500" /> Payments from Drovo</h3>
        <p className="text-xs text-gray-400 mb-4">Drovo pays you straight to the bank account saved below. You do not need to request anything.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-3"><div className="font-black text-gray-900">{naira(earned)}</div><div className="text-[11px] text-gray-400 font-medium">Total earned</div></div>
          <div className="rounded-xl bg-gray-50 p-3"><div className="font-black text-gray-900">{naira(paidOut)}</div><div className="text-[11px] text-gray-400 font-medium">Total paid to you</div></div>
        </div>
        {!account && <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">Add your bank account below so Drovo can pay you.</p>}
      </div>

      {/* Bank account */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-gray-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-orange-500" /> Bank account</h3>
          {account && !editing && <button onClick={openBankForm} className="text-xs font-bold text-orange-500">Change</button>}
        </div>

        {account && !editing && (
          <div className="text-sm">
            <div className="font-bold text-gray-900">{account.account_name}</div>
            <div className="text-gray-500">{account.bank_name} · ****{account.account_number.slice(-4)}</div>
          </div>
        )}

        {!account && !editing && (
          <button onClick={openBankForm} className="w-full py-3 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 font-bold text-sm hover:bg-orange-50">
            Add bank account
          </button>
        )}

        {editing && (
          <div className="space-y-3">
            <input value={acctNo} onChange={e => setAcctNo(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10-digit account number"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none" />

            {acctNo.length === 10 && !showAllBanks && (() => {
              const { likely, fintech } = candidateBanks(acctNo, banks);
              const chip = (b: { name: string; code: string }) => (
                <button key={b.code} type="button" onClick={() => setBankCode(b.code)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${bankCode === b.code ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                  {b.name}
                </button>
              );
              return (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500">Tap your bank</p>
                  {banks.length === 0 ? <p className="text-xs text-gray-400">Loading banks...</p> : (
                    <div className="flex flex-wrap gap-2">{[...likely, ...fintech].map(chip)}</div>
                  )}
                  <button type="button" onClick={() => setShowAllBanks(true)} className="text-xs font-bold text-orange-500">
                    My bank is not here
                  </button>
                </div>
              );
            })()}

            {acctNo.length === 10 && showAllBanks && (
              <select value={bankCode} onChange={e => setBankCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:border-orange-400 outline-none">
                <option value="">Choose your bank</option>
                {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            )}
            {checking && <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Checking account...</p>}
            {acctName && (
              <p className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {acctName}
              </p>
            )}
            {bankErr && <p className="text-xs text-red-600 font-medium">{bankErr}</p>}
            <div className="flex gap-2">
              <button onClick={saveAccount} disabled={!acctName || saving}
                className="flex-1 py-3 bg-gray-900 text-white font-black rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save this account
              </button>
              <button onClick={() => { setEditing(false); setBankErr(''); }} className="px-4 rounded-xl border border-gray-200 text-sm font-bold text-gray-500">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-black text-gray-900">History</h3></div>
        {txs.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {role === 'vendor' ? 'Earnings from delivered orders will show here.' : 'Delivery earnings will show here.'}
          </div>
        ) : txs.map(t => {
          const st = STATUS_LABEL[t.status] ?? { text: t.status, cls: 'bg-gray-100 text-gray-600' };
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.amount >= 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {t.amount >= 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{t.description ?? t.type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-black ${t.amount >= 0 ? 'text-green-600' : 'text-gray-900'}`}>{t.amount >= 0 ? '+' : ''}{naira(t.amount)}</div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}