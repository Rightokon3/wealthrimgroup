'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserX, UserCheck, RefreshCw, Users, Eye, X, ShieldCheck, ShieldAlert, Loader2, Store, Bike, ShoppingBag, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface RiderRow {
  user_id: string;
  is_active: boolean;
  email_verified: boolean | null;
  vehicle_type: string;
  total_deliveries: number;
}

const ROLE_COLOR: Record<string, string> = {
  customer: 'bg-gray-800 text-gray-400 border-gray-700',
  vendor:   'bg-violet-900/40 text-violet-400 border-violet-800',
  admin:    'bg-orange-900/40 text-orange-400 border-orange-800',
  super_admin: 'bg-orange-900/40 text-orange-400 border-orange-800',
  rider:    'bg-green-900/40 text-green-400 border-green-800',
};

const isAdminRole = (r: string) => r === 'admin' || r === 'super_admin';
const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
}

function VerifiedBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800">
      <ShieldCheck className="w-3 h-3" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800">
      <ShieldAlert className="w-3 h-3" /> Not verified
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-500 font-semibold flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-200 text-right break-words min-w-0">{children ?? '—'}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
      <h3 className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wide mb-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-3 text-center">
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[11px] text-gray-500 font-semibold">{label}</div>
    </div>
  );
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [riders,   setRiders]   = useState<Record<string, RiderRow>>({});
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [toggling, setToggling] = useState<string | null>(null);
  const [notice,   setNotice]   = useState('');

  // "View" panel
  const [viewId,  setViewId]  = useState<string | null>(null);
  const [detail,  setDetail]  = useState<any>(null);
  const [detLoading, setDetLoading] = useState(false);
  const [detError, setDetError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    let result = profiles;
    if (roleFilter !== 'all') result = result.filter(p => p.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    setFiltered(result);
  }, [profiles, search, roleFilter]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: profs }, { data: riderRows }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('riders').select('user_id, is_active, email_verified, vehicle_type, total_deliveries'),
    ]);
    setProfiles(profs ?? []);
    const riderMap: Record<string, RiderRow> = {};
    (riderRows ?? []).forEach((r: any) => { riderMap[r.user_id] = r; });
    setRiders(riderMap);
    setLoading(false);
  }

  // Deactivate / reactivate a customer, vendor or rider (never an admin). Done on the server.
  async function setActive(profile: Profile, active: boolean) {
    const name = profile.full_name || profile.email;
    const msg = active
      ? `Reactivate ${name}? They will be able to log in again.`
      : `Deactivate ${name}? They will be signed out and cannot log in until you reactivate them.` +
        (profile.role === 'vendor' ? ' Their shop will be hidden from customers.' : '');
    if (!window.confirm(msg)) return;

    setToggling(profile.id); setNotice('');
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ userId: profile.id, active }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(j.error ?? 'Could not change this account.'); return; }
      setProfiles(prev => prev.map(p => (p.id === profile.id ? ({ ...p, is_active: active } as any) : p)));
      if (profile.role === 'rider') setRiders(prev => (prev[profile.id] ? { ...prev, [profile.id]: { ...prev[profile.id], is_active: active } } : prev));
      if (detail?.profile?.id === profile.id) openView(profile.id);   // refresh the open panel
    } finally {
      setToggling(null);
    }
  }

  async function openView(id: string) {
    setViewId(id); setDetLoading(true); setDetError('');
    try {
      const res = await fetch(`/api/admin/users/details?id=${id}`, { headers: await authHeader() });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setDetError(j.error ?? 'Could not load this user.'); setDetail(null); }
      else setDetail(j);
    } catch {
      setDetError('Network problem. Try again.');
    } finally {
      setDetLoading(false);
    }
  }
  function closeView() { setViewId(null); setDetail(null); setDetError(''); }

  const d = detail;
  const dRole: string = d?.profile?.role ?? '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} users</p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {notice && (
        <div className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-800 text-red-300 text-sm font-semibold flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'customer', 'vendor', 'rider', 'admin'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r as UserRole | 'all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                roleFilter === r
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['User', 'Role', 'Status', 'Phone', 'City', 'Joined', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-800 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <span className="text-gray-600 text-sm">No users found.</span>
                  </td>
                </tr>
              ) : filtered.map(profile => {
                const rider = riders[profile.id];
                const role = String(profile.role);
                const active = (profile as any).is_active !== false && !(rider && !rider.is_active);
                const canToggle = !isAdminRole(role);
                return (
                  <motion.tr key={profile.id} layout
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${!active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm">{profile.full_name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{profile.email}</div>
                      {rider && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-green-600">🏍 {rider.vehicle_type} · {rider.total_deliveries} deliveries</span>
                          <VerifiedBadge ok={!!rider.email_verified} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_COLOR[role] ?? ROLE_COLOR.customer}`}>{role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${active ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                        {active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{profile.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{profile.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(profile.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openView(profile.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-gray-800 text-gray-200 border-gray-700 hover:border-orange-500 hover:text-orange-400 transition-all">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {canToggle && (
                          <button
                            onClick={() => setActive(profile, !active)}
                            disabled={toggling === profile.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
                              active
                                ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800'
                                : 'bg-green-900/30 text-green-400 border-green-800'
                            }`}>
                            {toggling === profile.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : active ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View panel ── */}
      <AnimatePresence>
        {viewId && (
          <>
            <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeView} className="fixed inset-0 bg-black/60 z-[60]" />
            <motion.aside key="panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-gray-900 border-l border-gray-800 z-[61] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-5 py-4 flex items-center justify-between">
                <h2 className="font-black text-white">User details</h2>
                <button onClick={closeView} aria-label="Close" className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {detLoading && <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-orange-500" /></div>}
                {detError && <div className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-800 text-red-300 text-sm font-semibold">{detError}</div>}

                {d && !detLoading && (
                  <>
                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-2xl font-black">
                        {(d.profile.full_name ?? d.profile.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-white text-lg truncate">{d.profile.full_name ?? '—'}</div>
                        <div className="text-xs text-gray-500 truncate">{d.profile.email}</div>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${ROLE_COLOR[dRole] ?? ROLE_COLOR.customer}`}>{dRole}</span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${d.profile.is_active && d.rider?.is_active !== false ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                            {d.profile.is_active && d.rider?.is_active !== false ? 'Active' : 'Deactivated'}
                          </span>
                          {dRole === 'rider' && d.rider && <VerifiedBadge ok={d.rider.email_verified} />}
                        </div>
                      </div>
                    </div>

                    {/* Account */}
                    <Section title="Account">
                      <Row label="Email">{d.profile.email}</Row>
                      <Row label="Email confirmed">{d.auth.email_confirmed_at ? `Yes · ${when(d.auth.email_confirmed_at)}` : 'No'}</Row>
                      <Row label="Phone">{d.profile.phone}</Row>
                      <Row label="City">{d.profile.city}</Row>
                      {d.profile.country && <Row label="Country">{d.profile.country}</Row>}
                      <Row label="Joined">{when(d.profile.created_at ?? d.auth.created_at)}</Row>
                      <Row label="Last login">{when(d.auth.last_sign_in_at)}</Row>
                      {d.profile.deactivated_at && <Row label="Deactivated on">{when(d.profile.deactivated_at)}</Row>}
                      {d.profile.deletion_requested_at && <Row label="Deletion requested">{when(d.profile.deletion_requested_at)}</Row>}
                      <Row label="User ID"><span className="font-mono text-xs">{d.profile.id}</span></Row>
                    </Section>

                    {/* Rider */}
                    {dRole === 'rider' && (d.rider ? (
                      <Section title="Rider" icon={<Bike className="w-3.5 h-3.5" />}>
                        <Row label="Verification"><VerifiedBadge ok={d.rider.email_verified} /></Row>
                        <Row label="Vehicle">{[d.rider.vehicle_type, d.rider.vehicle_plate].filter(Boolean).join(' · ') || '—'}</Row>
                        <Row label="Base city">{[d.rider.city, d.rider.state].filter(Boolean).join(', ') || '—'}</Row>
                        <Row label="Deliveries completed">{d.rider.delivered_orders}</Row>
                        <Row label="Pickup range">{d.rider.max_pickup_km ? `${d.rider.max_pickup_km} km` : '—'}</Row>
                        <Row label="Location pinned">{d.rider.has_location ? 'Yes' : 'No'}</Row>
                        <Row label="Emergency contact">
                          {d.rider.emergency_contact_phone ? `${d.rider.emergency_contact_name ?? 'Contact'} · ${d.rider.emergency_contact_phone}` : '—'}
                        </Row>
                        <Row label="Registered">{when(d.rider.created_at)}</Row>
                      </Section>
                    ) : (
                      <Section title="Rider"><p className="text-sm text-gray-500">No rider profile found for this account.</p></Section>
                    ))}

                    {/* Vendor */}
                    {dRole === 'vendor' && (
                      <>
                        {d.stats && (
                          <div className="grid grid-cols-3 gap-2">
                            <Stat label="Orders" value={d.stats.orders} />
                            <Stat label="Delivered" value={d.stats.delivered} />
                            <Stat label="Sales" value={naira(d.stats.revenue)} />
                          </div>
                        )}
                        <Section title={`Shop${d.stores?.length > 1 ? 's' : ''}`} icon={<Store className="w-3.5 h-3.5" />}>
                          {(d.stores ?? []).length === 0 && <p className="text-sm text-gray-500">No shop set up yet.</p>}
                          {(d.stores ?? []).map((s: any) => (
                            <div key={s.id} className="py-2 border-b border-gray-800/60 last:border-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white text-sm">{s.name ?? 'Unnamed shop'}</span>
                                <span className="flex items-center gap-1.5">
                                  {s.is_verified && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800">Verified</span>}
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${s.is_active ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                    {s.is_active ? 'Live' : 'Hidden'}
                                  </span>
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {[s.category, s.city].filter(Boolean).join(' · ')}{s.phone ? ` · ${s.phone}` : ''}
                              </div>
                              {s.address && <div className="text-xs text-gray-500">{s.address}</div>}
                            </div>
                          ))}
                        </Section>
                      </>
                    )}

                    {/* Customer */}
                    {dRole === 'customer' && (
                      <>
                        {d.stats && (
                          <div className="grid grid-cols-3 gap-2">
                            <Stat label="Orders" value={d.stats.orders} />
                            <Stat label="Delivered" value={d.stats.delivered} />
                            <Stat label="Spent" value={naira(d.stats.spent)} />
                          </div>
                        )}
                        <Section title="Saved addresses" icon={<MapPin className="w-3.5 h-3.5" />}>
                          {(d.addresses ?? []).length === 0 && <p className="text-sm text-gray-500">None saved.</p>}
                          {(d.addresses ?? []).map((a: any, i: number) => (
                            <div key={i} className="py-2 border-b border-gray-800/60 last:border-0">
                              <div className="text-sm text-white font-bold">{a.label}{a.is_default ? <span className="ml-2 text-[11px] text-orange-400">Default</span> : null}</div>
                              <div className="text-xs text-gray-500">{a.address}{a.city ? `, ${a.city}` : ''}{a.state ? `, ${a.state}` : ''}</div>
                            </div>
                          ))}
                        </Section>
                        <Section title="Recent orders" icon={<ShoppingBag className="w-3.5 h-3.5" />}>
                          {(d.recentOrders ?? []).length === 0 && <p className="text-sm text-gray-500">No orders yet.</p>}
                          {(d.recentOrders ?? []).map((o: any) => (
                            <div key={o.id} className="py-2 border-b border-gray-800/60 last:border-0 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-white font-bold truncate">{o.stores?.name ?? 'Order'}</div>
                                <div className="text-xs text-gray-500 capitalize">{String(o.status).replace(/_/g, ' ')} · {new Date(o.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="text-sm font-black text-white">{naira(Number(o.total ?? 0))}</div>
                            </div>
                          ))}
                        </Section>
                      </>
                    )}

                    {/* Action */}
                    {!isAdminRole(dRole) ? (
                      <button
                        onClick={() => setActive(
                          { id: d.profile.id, role: d.profile.role, full_name: d.profile.full_name, email: d.profile.email } as any,
                          !(d.profile.is_active && d.rider?.is_active !== false),
                        )}
                        disabled={toggling === d.profile.id}
                        className={`w-full py-3 rounded-xl font-black text-sm border flex items-center justify-center gap-2 disabled:opacity-50 ${
                          d.profile.is_active && d.rider?.is_active !== false
                            ? 'bg-red-900/20 text-red-400 border-red-800 hover:bg-red-900/40'
                            : 'bg-green-900/20 text-green-400 border-green-800 hover:bg-green-900/40'
                        }`}>
                        {toggling === d.profile.id ? <Loader2 className="w-4 h-4 animate-spin" />
                          : d.profile.is_active && d.rider?.is_active !== false
                            ? <><UserX className="w-4 h-4" /> Deactivate this account</>
                            : <><UserCheck className="w-4 h-4" /> Reactivate this account</>}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-600 text-center">Admin accounts cannot be deactivated from here.</p>
                    )}
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}