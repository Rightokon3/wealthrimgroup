'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Bell, Mail, Smartphone, Megaphone, LogOut, Trash2, CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Prefs = { order_emails: boolean; order_push: boolean; promo_emails: boolean };
const DEFAULTS: Prefs = { order_emails: true, order_push: true, promo_emails: false };

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` };
}

function Card({ icon: Icon, title, hint, children, danger }: { icon: any; title: string; hint?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border shadow-sm p-6 ${danger ? 'border-red-100' : 'border-gray-100'}`}>
      <h3 className={`font-black flex items-center gap-2 ${danger ? 'text-red-600' : 'text-gray-900'}`}><Icon className="w-4 h-4" /> {title}</h3>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return (
    <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-sm font-medium border ${m.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
      {m.ok ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}<span>{m.text}</span>
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${on ? 'bg-orange-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function SettingsPanel({ userId, deletionRequestedAt }: { userId: string; deletionRequestedAt?: string | null }) {
  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  // ── password ──
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [cf, setCf] = useState('');
  const [show, setShow] = useState(false); const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const checks = [nw.length >= 8, /[A-Za-z]/.test(nw), /\d/.test(nw)];
  const strong = checks.filter(Boolean).length;

  async function changePassword() {
    setPwMsg(null);
    if (!cur || !nw || !cf) return setPwMsg({ ok: false, text: 'Fill in every field.' });
    if (nw !== cf) return setPwMsg({ ok: false, text: 'The new passwords do not match.' });
    if (strong < 3) return setPwMsg({ ok: false, text: 'Use at least 8 characters with letters and numbers.' });
    setPwBusy(true);
    const res = await fetch('/api/account/password', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ current: cur, next: nw }) });
    const j = await res.json().catch(() => ({}));
    setPwBusy(false);
    if (!res.ok) return setPwMsg({ ok: false, text: j.error ?? 'Could not change your password.' });
    setCur(''); setNw(''); setCf('');
    await supabase.auth.signOut({ scope: 'others' });   // every other device must log in again
    setPwMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
  }

  // ── notifications (saved the moment a switch is tapped) ──
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.from('notification_preferences').select('order_emails,order_push,promo_emails').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setPrefs(data as Prefs); setPrefsLoaded(true); });
  }, [userId]);

  async function setPref(key: keyof Prefs, value: boolean) {
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value }); setPrefMsg(null);
    const { error } = await supabase.from('notification_preferences')
      .upsert({ user_id: userId, ...prefs, [key]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) { setPrefs(prev); setPrefMsg({ ok: false, text: 'Could not save that. Try again.' }); }
    else setPrefMsg({ ok: true, text: 'Saved.' });
  }

  // ── sessions ──
  const [outBusy, setOutBusy] = useState(false);
  const [outMsg, setOutMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function signOutOthers() {
    setOutBusy(true); setOutMsg(null);
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setOutBusy(false);
    setOutMsg(error ? { ok: false, text: 'Could not sign out other devices.' } : { ok: true, text: 'Signed out of all other devices.' });
  }

  // ── delete account ──
  const [requested, setRequested] = useState(!!deletionRequestedAt);
  const [open, setOpen] = useState(false); const [word, setWord] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function deletion(action: 'request' | 'cancel') {
    setDelBusy(true); setDelMsg(null);
    const res = await fetch('/api/account/delete-request', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action, confirm: word }) });
    const j = await res.json().catch(() => ({}));
    setDelBusy(false);
    if (!res.ok) return setDelMsg({ ok: false, text: j.error ?? 'Something went wrong.' });
    setRequested(action === 'request'); setOpen(false); setWord('');
    setDelMsg({ ok: true, text: action === 'request' ? 'Request received. Our team will close your account shortly.' : 'Request cancelled. Your account stays open.' });
  }

  const rows: { key: keyof Prefs; icon: any; title: string; sub: string }[] = [
    { key: 'order_emails', icon: Mail,       title: 'Order emails',        sub: 'Emails when your order is confirmed, on its way or delivered.' },
    { key: 'order_push',   icon: Smartphone, title: 'Order alerts',        sub: 'Alerts on your phone or browser about your orders.' },
    { key: 'promo_emails', icon: Megaphone,  title: 'Deals and news',      sub: 'Offers and updates from Drovo. Off unless you turn it on.' },
  ];

  return (
    <div className="space-y-4">
      <Card icon={Lock} title="Change password" hint="Use at least 8 characters with letters and numbers.">
        <div className="space-y-3">
          <input type={show ? 'text' : 'password'} value={cur} onChange={e => setCur(e.target.value)} placeholder="Current password" autoComplete="current-password" className={ic} />
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={nw} onChange={e => setNw(e.target.value)} placeholder="New password" autoComplete="new-password" className={`${ic} pr-11`} />
            <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide passwords' : 'Show passwords'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          {nw && (
            <div>
              <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strong ? (strong === 3 ? 'bg-green-500' : strong === 2 ? 'bg-amber-400' : 'bg-red-400') : 'bg-gray-200'}`} />)}</div>
              <p className="text-xs text-gray-400 mt-1">{strong === 3 ? 'Strong enough.' : '8+ characters, a letter and a number.'}</p>
            </div>
          )}
          <input type={show ? 'text' : 'password'} value={cf} onChange={e => setCf(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className={ic} />
          <button onClick={changePassword} disabled={pwBusy}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm disabled:opacity-60 flex items-center gap-2">
            {pwBusy && <Loader2 className="w-4 h-4 animate-spin" />} Update password
          </button>
        </div>
        <Msg m={pwMsg} />
      </Card>

      <Card icon={Bell} title="Notifications" hint="Choose what we send you. Important notices, like refunds and cancellations, are always sent.">
        <div className="divide-y divide-gray-100">
          {rows.map(r => (
            <div key={r.key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0"><r.icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0"><div className="text-sm font-bold text-gray-900">{r.title}</div><div className="text-xs text-gray-400">{r.sub}</div></div>
              <Toggle on={prefs[r.key]} disabled={!prefsLoaded} onChange={v => setPref(r.key, v)} />
            </div>
          ))}
        </div>
        <Msg m={prefMsg} />
      </Card>

      <Card icon={ShieldCheck} title="Devices" hint="Signed in on a phone or computer you no longer use? Sign it out here.">
        <button onClick={signOutOthers} disabled={outBusy}
          className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-gray-300 flex items-center gap-2 disabled:opacity-60">
          {outBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Sign out of other devices
        </button>
        <Msg m={outMsg} />
      </Card>

      <Card icon={Trash2} title="Close account" hint="This asks our team to delete your account and personal details." danger>
        {requested ? (
          <div>
            <p className="text-sm text-gray-600">Your request to delete this account has been received. Changed your mind?</p>
            <button onClick={() => deletion('cancel')} disabled={delBusy} className="mt-3 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm disabled:opacity-60">Cancel my request</button>
          </div>
        ) : !open ? (
          <button onClick={() => setOpen(true)} className="px-5 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50">Delete my account</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">You will lose your saved addresses and order history. Type <b>DELETE</b> to confirm.</p>
            <input value={word} onChange={e => setWord(e.target.value)} placeholder="DELETE" className={ic} />
            <div className="flex gap-3">
              <button onClick={() => { setOpen(false); setWord(''); }} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm">Cancel</button>
              <button onClick={() => deletion('request')} disabled={delBusy || word !== 'DELETE'}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {delBusy && <Loader2 className="w-4 h-4 animate-spin" />} Delete account
              </button>
            </div>
          </div>
        )}
        <Msg m={delMsg} />
      </Card>
    </div>
  );
}