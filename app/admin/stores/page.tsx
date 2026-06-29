'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle, XCircle, RefreshCw, Store as StoreIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Store, CATEGORY_META } from '@/types';

export default function AdminStores() {
  const [stores,   setStores]   = useState<Store[]>([]);
  const [filtered, setFiltered] = useState<Store[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [catFilter, setCatFilter] = useState<'all' | 'food' | 'real_estate' | 'fashion'>('all');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { fetchStores(); }, []);

  useEffect(() => {
    let result = stores;
    if (catFilter !== 'all') result = result.filter(s => s.category === catFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [stores, search, catFilter]);

  async function fetchStores() {
    setLoading(true);
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });
    setStores(data ?? []);
    setLoading(false);
  }

  async function toggleVerified(store: Store) {
    setToggling(store.id);
    await supabase.from('stores').update({ is_verified: !store.is_verified }).eq('id', store.id);
    setStores(prev => prev.map(s => s.id === store.id ? { ...s, is_verified: !s.is_verified } : s));
    setToggling(null);
  }

  async function toggleActive(store: Store) {
    setToggling(store.id + '_active');
    await supabase.from('stores').update({ is_active: !store.is_active }).eq('id', store.id);
    setStores(prev => prev.map(s => s.id === store.id ? { ...s, is_active: !s.is_active } : s));
    setToggling(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Stores</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} stores</p>
        </div>
        <button onClick={fetchStores}
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
            placeholder="Search store name, city..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'food', 'real_estate', 'fashion'] as const).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                catFilter === c
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
              }`}>
              {c === 'all' ? 'All' : CATEGORY_META[c].icon + ' ' + CATEGORY_META[c].label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Store cards */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-800 rounded-2xl h-24 border border-gray-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <StoreIcon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No stores found.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(store => {
            const meta = CATEGORY_META[store.category];
            return (
              <motion.div key={store.id} layout
                className={`bg-gray-900 rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                  store.is_active ? 'border-gray-800' : 'border-red-900/50 opacity-60'
                }`}>
                {/* Logo */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">
                  {store.logo_url
                    ? <img src={store.logo_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">{meta.icon}</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-white text-sm">{store.name}</span>
                    {store.is_verified && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-bold">✓ Verified</span>
                    )}
                    {!store.is_active && (
                      <span className="text-xs bg-red-900/40 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">Deactivated</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {meta.icon} {meta.label} · {store.city} · ⭐ {store.rating} ({store.total_reviews})
                  </div>
                  <div className="text-xs text-gray-600">{store.phone}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleVerified(store)}
                    disabled={toggling === store.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
                      store.is_verified
                        ? 'bg-blue-900/30 text-blue-400 border-blue-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-blue-900/30 hover:text-blue-400 hover:border-blue-800'
                    }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {store.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    onClick={() => toggleActive(store)}
                    disabled={toggling === store.id + '_active'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
                      store.is_active
                        ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800'
                        : 'bg-green-900/30 text-green-400 border-green-800 hover:bg-gray-800'
                    }`}>
                    <XCircle className="w-3.5 h-3.5" />
                    {store.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}