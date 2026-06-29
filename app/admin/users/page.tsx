'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserX, UserCheck, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface RiderRow {
  user_id: string;
  is_active: boolean;
  vehicle_type: string;
  total_deliveries: number;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [riders,   setRiders]   = useState<Record<string, RiderRow>>({});
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    let result = profiles;
    if (roleFilter !== 'all') result = result.filter(p => p.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    setFiltered(result);
  }, [profiles, search, roleFilter]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: profs }, { data: riderRows }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('riders').select('user_id, is_active, vehicle_type, total_deliveries'),
    ]);
    setProfiles(profs ?? []);
    const riderMap: Record<string, RiderRow> = {};
    (riderRows ?? []).forEach(r => { riderMap[r.user_id] = r; });
    setRiders(riderMap);
    setLoading(false);
  }

  // Deactivate/reactivate: for riders toggle riders.is_active,
  // for others we repurpose a soft-delete via role change is NOT ideal —
  // instead we just show status and let admin manage via Supabase dashboard for now.
  // For riders we CAN toggle is_active directly.
  async function toggleRiderActive(userId: string, current: boolean) {
    setToggling(userId);
    await supabase.from('riders').update({ is_active: !current }).eq('user_id', userId);
    setRiders(prev => ({
      ...prev,
      [userId]: { ...prev[userId], is_active: !current }
    }));
    setToggling(null);
  }

  const ROLE_COLOR: Record<UserRole, string> = {
    customer: 'bg-gray-800 text-gray-400 border-gray-700',
    vendor:   'bg-violet-900/40 text-violet-400 border-violet-800',
    admin:    'bg-orange-900/40 text-orange-400 border-orange-800',
    rider:    'bg-green-900/40 text-green-400 border-green-800',
  };

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
        <div className="flex gap-2">
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
                {['User', 'Role', 'Phone', 'City', 'Joined', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-gray-800 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <span className="text-gray-600 text-sm">No users found.</span>
                  </td>
                </tr>
              ) : filtered.map(profile => {
                const rider = riders[profile.id];
                const isRiderInactive = rider && !rider.is_active;
                return (
                  <motion.tr key={profile.id} layout
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${isRiderInactive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white text-sm">{profile.full_name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{profile.email}</div>
                      {rider && (
                        <div className="text-xs text-green-600 mt-0.5">
                          🏍 {rider.vehicle_type} · {rider.total_deliveries} deliveries
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_COLOR[profile.role]}`}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{profile.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{profile.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {profile.role === 'rider' && rider ? (
                        <button
                          onClick={() => toggleRiderActive(profile.id, rider.is_active)}
                          disabled={toggling === profile.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
                            rider.is_active
                              ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800'
                              : 'bg-green-900/30 text-green-400 border-green-800'
                          }`}>
                          {rider.is_active
                            ? <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                            : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>
                          }
                        </button>
                      ) : (
                        <span className="text-xs text-gray-700">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}