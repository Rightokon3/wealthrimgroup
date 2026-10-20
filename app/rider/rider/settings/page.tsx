'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Bike, Car, Gauge, MapPin, Bell, ShieldAlert, Lock, Eye, EyeOff, LogOut,
  Wallet, ChevronRight, Loader2, CheckCircle, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CityPicker from '@/components/CityPicker';

type Msg = { ok: boolean; text: string } | null;
interface R {
  full_name: string; phone: string; city: string; vehicle_type: string; vehicle_plate: string;
  max_pickup_km: number; notify_new_orders: boolean; emergency_contact_name: string; emergency_contact_phone: string;
}
const VEHICLES = [
  { value: 'motorcycle', label: 'Motorcycle', icon: Gauge },
  { value: 'bicycle', label: 'Bicycle', icon: Bike },
  { value: 'car', label: 'Car', icon: Car },
];

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` };
}

function Card({ icon: Icon, title, hint, children }: { icon: any; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-black text-gray-900 flex items-center gap-2"><Icon className="w-4 h-4 text-green-600" /> {title}</h2>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}
function Note({ m }: { m: Msg }) {
  if (!m) return null;
  return (
    <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-sm font-medium border ${m.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
      {m.ok ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}<span>{m.text}</span>
    </div>
  );
}
const Save = ({ busy, onClick, label = 'Save changes' }: { busy: boolean; onClick: () => void; label?: string }) => (
  <button onClick={onClick} disabled={busy}
    className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl text-sm disabled:opacity-60 flex items-center gap-2">
    {busy && <Loader2 className="w-4 h-4 animate-spin" />} {label}
  </button>
);

export default function RiderSettings() {
  const router = useRouter();
  const [r, setR] = useState<R | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, Msg>>({});
  const say = (k: string, m: Msg) => setMsg(p => ({ ...p, [k]: m }));

  // password / devices
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [cf, setCf] = useState(''); const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/rider/login'); return; }
      const res = await fetch('/api/rider/settings', { headers: await headers(), cache: 'no-store' });
      if (!res.ok) { router.replace('/rider/login'); return; }
      const j = await res.json();
      setEmail(j.email ?? '');
      setR({
        full_name: j.rider.full_name ?? '', phone: j.rider.phone ?? '', city: j.rider.city ?? '',
        vehicle_type: j.rider.vehicle_type ?? 'motorcycle', vehicle_plate: j.rider.vehicle_plate ?? '',
        max_pickup_km: j.rider.max_pickup_km ?? 25, notify_new_orders: j.rider.notify_new_orders ?? true,
        emergency_contact_name: j.rider.emergency_contact_name ?? '', emergency_contact_phone: j.rider.emergency_contact_phone ?? '',
      });
      setLoading(false);
    })();
  }, [router]);

  async function save(key: string, fields: Partial<R>, okText = 'Saved.') {
    setBusy(key); say(key, null);
    const res = await fetch('/api/rider/settings', { method: 'POST', headers: await headers(), body: JSON.stringify(fields) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    say(key, res.ok ? { ok: true, text: okText } : { ok: false, text: j.error ?? 'Could not save.' });
    return res.ok;
  }

  async function changePassword() {
    say('pw', null);
    if (!cur || !nw || !cf) return say('pw', { ok: false, text: 'Fill in every field.' });
    if (nw !== cf) return say('pw', { ok: false, text: 'The new passwords do not match.' });
    if (nw.length < 8 || !/[A-Za-z]/.test(nw) || !/\d/.test(nw)) return say('pw', { ok: false, text: 'Use at least 8 characters with letters and numbers.' });
    setBusy('pw');
    const res = await fetch('/api/account/password', { method: 'POST', headers: await headers(), body: JSON.stringify({ current: cur, next: nw }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return say('pw', { ok: false, text: j.error ?? 'Could not change your password.' });
    setCur(''); setNw(''); setCf('');
    await supabase.auth.signOut({ scope: 'others' });
    say('pw', { ok: true, text: 'Password changed. Other devices have been signed out.' });
  }

  async function signOutOthers() {
    setBusy('dev');
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setBusy(null);
    say('dev', error ? { ok: false, text: 'Could not sign out other devices.' } : { ok: true, text: 'Signed out of all other devices.' });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/rider/login');
  }

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 bg-gray-50 focus:bg-white';
  const lbl = 'block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5';

  if (loading || !r) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-7 h-7 text-green-600 animate-spin" /></div>;
  const set = (k: keyof R, v: any) => setR(p => (p ? { ...p, [k]: v } : p));

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-gray-950 text-white">
        <div className="max-w-[480px] mx-auto px-4 py-5 flex items-center gap-3">
          <Link href="/rider/dashboard" aria-label="Back" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
          <div><h1 className="font-black text-lg leading-tight">Settings</h1><p className="text-xs text-gray-400">{email}</p></div>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-5 space-y-4">
        <Link href="/rider/earnings" className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
          <div className="flex-1 font-black text-gray-900 text-sm">Earnings and payouts</div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Card icon={User} title="Profile">
          <div className="space-y-3">
            <div><label className={lbl}>Full name</label><input value={r.full_name} onChange={e => set('full_name', e.target.value)} className={ic} /></div>
            <div><label className={lbl}>Phone</label><input type="tel" value={r.phone} onChange={e => set('phone', e.target.value)} className={ic} /></div>
            <div>
              <label className={lbl}>City</label>
              <CityPicker value={r.city} onChange={v => set('city', v)} className={ic} />
            </div>
          </div>
          <Save busy={busy === 'profile'} onClick={() => save('profile', { full_name: r.full_name, phone: r.phone, city: r.city })} />
          <Note m={msg.profile ?? null} />
        </Card>

        <Card icon={Bike} title="Vehicle">
          <div className="grid grid-cols-3 gap-3">
            {VEHICLES.map(v => (
              <button key={v.value} type="button" onClick={() => set('vehicle_type', v.value)}
                className={`py-3 rounded-xl border-2 text-center transition-all ${r.vehicle_type === v.value ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <v.icon className={`w-6 h-6 mx-auto mb-1 ${r.vehicle_type === v.value ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-xs font-bold text-gray-700">{v.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-3"><label className={lbl}>Plate number</label>
            <input value={r.vehicle_plate} onChange={e => set('vehicle_plate', e.target.value.toUpperCase())} placeholder="e.g. LAG-123-AB" className={`${ic} font-mono`} /></div>
          <Save busy={busy === 'vehicle'} onClick={() => save('vehicle', { vehicle_type: r.vehicle_type, vehicle_plate: r.vehicle_plate })} />
          <Note m={msg.vehicle ?? null} />
        </Card>

        <Card icon={MapPin} title="Work preferences" hint="Choose how far you are willing to go for a pickup.">
          <div className="flex items-center justify-between text-sm mb-2"><span className="font-bold text-gray-700">Farthest pickup</span><span className="font-black text-green-600">{r.max_pickup_km} km</span></div>
          <input type="range" min={1} max={50} value={r.max_pickup_km} onChange={e => set('max_pickup_km', Number(e.target.value))} className="w-full accent-green-600" />
          <div className="flex justify-between text-[11px] text-gray-400"><span>1 km</span><span>50 km</span></div>
          <Save busy={busy === 'work'} onClick={() => save('work', { max_pickup_km: r.max_pickup_km })} />
          <Note m={msg.work ?? null} />
        </Card>

        <Card icon={Bell} title="Notifications">
          <div className="flex items-center gap-4">
            <div className="flex-1"><div className="text-sm font-bold text-gray-900">New order alerts</div><div className="text-xs text-gray-400">Get a phone or browser alert when an order is ready near you.</div></div>
            <button type="button" role="switch" aria-checked={r.notify_new_orders} disabled={busy === 'alerts'}
              onClick={async () => { const v = !r.notify_new_orders; set('notify_new_orders', v); if (!(await save('alerts', { notify_new_orders: v }))) set('notify_new_orders', !v); }}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${r.notify_new_orders ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${r.notify_new_orders ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <Note m={msg.alerts ?? null} />
        </Card>

        <Card icon={ShieldAlert} title="Safety" hint="Someone we can call if there is a problem on a delivery. Only Drovo support can see this.">
          <div className="space-y-3">
            <div><label className={lbl}>Contact name</label><input value={r.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} className={ic} /></div>
            <div><label className={lbl}>Contact phone</label><input type="tel" value={r.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} className={ic} /></div>
          </div>
          <Save busy={busy === 'safety'} onClick={() => save('safety', { emergency_contact_name: r.emergency_contact_name, emergency_contact_phone: r.emergency_contact_phone })} />
          <Note m={msg.safety ?? null} />
        </Card>

        <Card icon={Lock} title="Password" hint="At least 8 characters with letters and numbers.">
          <div className="space-y-3">
            <input type={show ? 'text' : 'password'} value={cur} onChange={e => setCur(e.target.value)} placeholder="Current password" autoComplete="current-password" className={ic} />
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={nw} onChange={e => setNw(e.target.value)} placeholder="New password" autoComplete="new-password" className={`${ic} pr-11`} />
              <button type="button" onClick={() => setShow(v => !v)} aria-label="Show or hide passwords" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            <input type={show ? 'text' : 'password'} value={cf} onChange={e => setCf(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className={ic} />
          </div>
          <Save busy={busy === 'pw'} onClick={changePassword} label="Update password" />
          <Note m={msg.pw ?? null} />
        </Card>

        <Card icon={ShieldCheck} title="Devices" hint="Signed in on a phone you no longer use? Sign it out here.">
          <button onClick={signOutOthers} disabled={busy === 'dev'} className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm flex items-center gap-2 disabled:opacity-60">
            {busy === 'dev' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Sign out of other devices
          </button>
          <Note m={msg.dev ?? null} />
        </Card>

        <button onClick={signOut} className="w-full py-3.5 rounded-2xl bg-white border border-red-100 text-red-600 font-black text-sm flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
