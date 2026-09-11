'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Store as StoreIcon, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Store, Product, CATEGORY_META } from '@/types';

type ProductResult = Product & { stores: Pick<Store, 'id' | 'name' | 'category' | 'city'> | null };

function toPattern(q: string) {
  return `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQuery(initialQ);
    if (initialQ.trim()) runSearch(initialQ.trim());
    else { setStores([]); setProducts([]); setLoading(false); }
  }, [initialQ]);

  async function runSearch(q: string) {
    setLoading(true);
    const pattern = toPattern(q);
    const [storesRes, productsRes] = await Promise.all([
      supabase.from('stores').select('*').eq('is_active', true).ilike('name', pattern).order('rating', { ascending: false }).limit(24),
      supabase.from('products').select('*, stores!inner(id,name,category,city,is_active)').eq('is_available', true).eq('stores.is_active', true).ilike('name', pattern).limit(24),
    ]);
    setStores(storesRes.data ?? []);
    setProducts((productsRes.data as any) ?? []);
    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const hasResults = stores.length > 0 || products.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pt-[64px]">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-2xl p-2 shadow-lg mb-8 max-w-2xl">
          <div className="flex items-center gap-2 flex-1 px-3">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for food, fashion, properties..."
              className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all">
            Search
          </button>
        </form>

        {!initialQ.trim() ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400">Type something to search stores and products.</p>
          </div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100 h-52" />)}
          </div>
        ) : !hasResults ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <StoreIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-black text-gray-700 mb-2">No results for "{initialQ}"</h3>
            <p className="text-gray-400 text-sm mb-5">Try a different search term.</p>
            <Link href="/" className="text-orange-500 font-bold text-sm">← Back to home</Link>
          </div>
        ) : (
          <>
            {stores.length > 0 && (
              <section className="mb-10">
                <h2 className="font-black text-gray-900 text-lg mb-4">Stores ({stores.length})</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {stores.map((s, i) => <StoreResultCard key={s.id} store={s} delay={i} />)}
                </div>
              </section>
            )}
            {products.length > 0 && (
              <section>
                <h2 className="font-black text-gray-900 text-lg mb-4">Products ({products.length})</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {products.map((p, i) => <ProductResultCard key={p.id} product={p} delay={i} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StoreResultCard({ store, delay }: { store: Store; delay: number }) {
  const meta = CATEGORY_META[store.category];
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.03 }}>
      <Link href={`/store/${store.id}`}>
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="relative h-32 overflow-hidden">
            {store.cover_url ? (
              <img src={store.cover_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-4xl`}>{meta.icon}</div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-black text-gray-900 text-sm mb-1 truncate">{store.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{store.rating.toFixed(1)}
              <MapPin className="w-3 h-3 ml-1" />{store.city}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-orange-600">
              Visit store <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ProductResultCard({ product, delay }: { product: ProductResult; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.03 }}>
      <Link href={`/store/${product.store_id}?product=${product.id}`}>
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
          <div className="relative h-32 overflow-hidden bg-gray-50">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-black text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
            <p className="text-xs text-gray-400 mb-2 truncate">at {product.stores?.name ?? 'Store'}</p>
            <p className="font-black text-orange-600 text-sm">₦{product.price.toLocaleString()}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchInner />
    </Suspense>
  );
}