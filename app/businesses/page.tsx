'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Clock, Star, Shield, Store as StoreIcon,
  SlidersHorizontal, X, ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Store, CATEGORY_META, StoreCategory } from '@/types';

const CATEGORIES: { value: StoreCategory; emoji: string; label: string }[] = [
  { value: 'food',        emoji: '🍛', label: 'Food' },
  { value: 'real_estate', emoji: '🏠', label: 'Real Estate' },
  { value: 'fashion',     emoji: '👗', label: 'Fashion' },
];

const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Accra', 'Nairobi'];
const PAGE_SIZE = 12;

type SortKey = 'rating' | 'newest' | 'delivery';

function VendorCard({ store }: { store: Store }) {
  const meta = CATEGORY_META[store.category];
  return (
    <Link href={`/store/${store.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-orange-100/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <div className="relative h-40 overflow-hidden">
          {store.cover_url
            ? <img src={store.cover_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-5xl`}>{meta.icon}</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {!store.is_open && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">Closed</span>
            </div>
          )}
          {store.logo_url && (
            <img src={store.logo_url} alt="" className="absolute bottom-3 left-3 w-10 h-10 rounded-xl border-2 border-white shadow-lg object-cover" />
          )}
          {store.is_verified && (
            <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" />Verified
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-black text-gray-900 text-sm mb-1 group-hover:text-orange-600 transition-colors truncate">{store.name}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 flex-wrap">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{store.rating.toFixed(1)} ({store.total_reviews})</span>
            {store.category === 'food' && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{store.avg_delivery_min}–{store.avg_delivery_min + 15} min</span>}
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{store.city}</span>
          </div>
          <div className={`w-full py-2 rounded-xl text-center text-xs font-black transition-all border
            ${store.category === 'food' ? 'bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500'
            : store.category === 'real_estate' ? 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500'
            : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500'}`}>
            {meta.orderLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}

function BusinessesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search,    setSearch]    = useState(searchParams.get('search') ?? '');
  const [city,      setCity]      = useState('');
  const [activeCat, setActiveCat] = useState<StoreCategory | 'all'>('all');
  const [sort,      setSort]      = useState<SortKey>('rating');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [stores,  setStores]  = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,    setPage]    = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total,   setTotal]   = useState(0);

  const buildQuery = useCallback((pageIndex: number) => {
    let q = supabase.from('stores').select('*', { count: 'exact' }).eq('is_active', true);
    if (activeCat !== 'all') q = q.eq('category', activeCat);
    if (city) q = q.ilike('city', `%${city}%`);
    if (search) q = q.ilike('name', `%${search}%`);

    if (sort === 'rating')   q = q.order('rating', { ascending: false });
    if (sort === 'newest')   q = q.order('created_at', { ascending: false });
    if (sort === 'delivery') q = q.order('avg_delivery_min', { ascending: true });

    const from = pageIndex * PAGE_SIZE;
    return q.range(from, from + PAGE_SIZE - 1);
  }, [activeCat, city, search, sort]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setPage(0);
    const { data, error, count } = await buildQuery(0);
    if (error) console.error('fetchStores error:', error);
    setStores(data ?? []);
    setTotal(count ?? 0);
    setHasMore((count ?? 0) > PAGE_SIZE);
    setLoading(false);
  }, [buildQuery]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const { data, error } = await buildQuery(nextPage);
    if (error) console.error('loadMore error:', error);
    const newRows = data ?? [];
    setStores(prev => [...prev, ...newRows]);
    setPage(nextPage);
    setHasMore((nextPage + 1) * PAGE_SIZE < total);
    setLoadingMore(false);
  };

  useEffect(() => { fetchFirstPage(); }, [fetchFirstPage]);

  // Keep the URL's ?search= in sync so links from elsewhere still work
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (search) params.set('search', search); else params.delete('search');
      router.replace(`/businesses?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearFilters = () => { setSearch(''); setCity(''); setActiveCat('all'); setSort('rating'); };
  const activeFilterCount = [city, activeCat !== 'all', sort !== 'rating'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-[1200px] mx-auto px-4 py-5">
          <h1 className="text-2xl font-black text-gray-900 mb-1">All Vendors</h1>
          <p className="text-sm text-gray-400 mb-4">
            {loading ? 'Loading vendors…' : `${total} vendor${total === 1 ? '' : 's'} found`}
          </p>

          {/* Search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 h-11">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors by name..."
                className="w-full text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={`flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-bold border-2 transition-all flex-shrink-0 ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expandable filter row */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 h-10">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="text-sm text-gray-600 outline-none bg-transparent"
                    >
                      <option value="">All Cities</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 h-10">
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={sort}
                      onChange={e => setSort(e.target.value as SortKey)}
                      className="text-sm text-gray-600 outline-none bg-transparent"
                    >
                      <option value="rating">Top Rated</option>
                      <option value="newest">Newest</option>
                      <option value="delivery">Fastest Delivery</option>
                    </select>
                  </div>

                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-sm font-bold text-orange-600 hover:text-orange-700">
                      Clear all
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category pills */}
          <div className="flex items-center gap-3 overflow-x-auto pt-4 pb-1">
            <button onClick={() => setActiveCat('all')}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-black border-2 transition-all ${
                activeCat === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}>
              All
            </button>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setActiveCat(c.value)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-black border-2 transition-all ${
                  activeCat === c.value ? 'bg-orange-50 text-orange-700 border-orange-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>
                <span>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="max-w-[1200px] mx-auto px-4 pt-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map(c => (
            <div key={c.value} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{c.emoji}</div>
              <div className="text-xl font-black text-gray-900">{stores.filter(s => s.category === c.value).length}</div>
              <div className="text-xs text-gray-400 font-medium">{c.label} Vendors</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <StoreIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-black text-gray-700 mb-2">No vendors found</h3>
            <p className="text-gray-400 text-sm mb-5">Try a different search, city, or category.</p>
            <button onClick={clearFilters} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {stores.map((store, i) => (
                <motion.div key={store.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % PAGE_SIZE) * 0.03 }}>
                  <VendorCard store={store} />
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8 pb-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white border-2 border-gray-200 rounded-2xl font-black text-sm text-gray-700 hover:border-gray-400 transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load More Vendors'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <BusinessesInner />
    </Suspense>
  );
}