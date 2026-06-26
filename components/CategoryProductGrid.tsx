'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Star, Clock, Package, BedDouble, Bath,
  Maximize2, Tag, ShoppingBag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product, Store, StoreCategory, CATEGORY_META } from '@/types';

// A product joined with just the parent-store fields we need to render the card
interface ProductWithStore extends Product {
  stores: Pick<Store, 'id'|'name'|'city'|'logo_url'|'rating'|'is_open'|'avg_delivery_min'|'category'>;
}

const CITIES = ['Lagos','Abuja','Port Harcourt','Ibadan','Kano','Accra','Nairobi'];

export default function CategoryProductGrid({ category }: { category: StoreCategory }) {
  const meta = CATEGORY_META[category];

  const [products, setProducts] = useState<ProductWithStore[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [city,     setCity]     = useState('');
  const [sort,     setSort]     = useState<'newest'|'price_low'|'price_high'|'rating'>('newest');

  useEffect(() => { fetchProducts(); }, [city, category]);

  async function fetchProducts() {
    setLoading(true);
    // Products joined to their store; filter store.category and store.is_active here,
    // then filter store.city client-side (Supabase can't filter a joined column server-side
    // without an inner-join hint, so we widen the select and narrow after).
    let q = supabase
      .from('products')
      .select('*, stores!inner(id,name,city,logo_url,rating,is_open,is_active,avg_delivery_min,category)')
      .eq('is_available', true)
      .eq('stores.category', category)
      .eq('stores.is_active', true)
      .order('created_at', { ascending: false })
      .limit(60);

    const { data, error } = await q;
    if (error) { console.error('CategoryProductGrid fetch error:', error); setProducts([]); setLoading(false); return; }

    let rows = (data ?? []) as unknown as ProductWithStore[];
    if (city) rows = rows.filter(p => p.stores?.city?.toLowerCase().includes(city.toLowerCase()));
    setProducts(rows);
    setLoading(false);
  }

  const filtered = products
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.stores?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_low')  return a.price - b.price;
      if (sort === 'price_high') return b.price - a.price;
      if (sort === 'rating')     return (b.stores?.rating ?? 0) - (a.stores?.rating ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className={`relative bg-gradient-to-br ${meta.gradient} text-white pt-[64px]`}>
        <div className="max-w-[1200px] mx-auto px-6 py-12 text-center">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}}>
            <div className="text-5xl mb-3">{meta.icon}</div>
            <h1 className="text-3xl md:text-5xl font-black mb-2">{meta.label}</h1>
            <p className="text-white/80 text-base mb-7">
              {category==='food' && 'Browse menu items from every restaurant near you'}
              {category==='real_estate' && 'Browse every property listed for sale, rent or shortlet'}
              {category==='fashion' && 'Browse fashion items from every vendor in one place'}
            </p>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl max-w-xl mx-auto">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder={`Search ${meta.productLabel.toLowerCase()}s or stores...`}
                  className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400"/>
              </div>
              <div className="flex items-center gap-1.5 px-3 border-l border-gray-200">
                <MapPin className="w-4 h-4 text-gray-400"/>
                <select value={city} onChange={e=>setCity(e.target.value)} className="text-sm text-gray-600 outline-none bg-transparent">
                  <option value="">All Cities</option>
                  {CITIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className="text-sm text-gray-500 font-medium">
            {loading ? 'Loading...' : `${filtered.length} ${meta.productLabel.toLowerCase()}${filtered.length!==1?'s':''} found`}
          </p>
          <select value={sort} onChange={e=>setSort(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white outline-none focus:border-orange-400">
            <option value="newest">Newest first</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="rating">Top Rated Stores</option>
          </select>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1,2,3,4,5,6,7,8].map(i=>(
              <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-40 bg-gray-200"/>
                <div className="p-4 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4"/><div className="h-3 bg-gray-200 rounded w-1/2"/></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
            <h3 className="font-black text-gray-700 mb-2">No {meta.productLabel.toLowerCase()}s found</h3>
            <p className="text-gray-400 text-sm mb-5">Try a different search or city.</p>
            <button onClick={()=>{setSearch('');setCity('');}} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600">Clear filters</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((p,i)=>(
              <motion.div key={p.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*.03,.3)}}>
                <ProductCard product={p} category={category}/>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, category }: { product: ProductWithStore; category: StoreCategory }) {
  const meta = CATEGORY_META[category];
  const store = product.stores;

  return (
    <Link href={`/store/${store.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-orange-100/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="relative h-40 overflow-hidden flex-shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
            : <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-4xl`}>{meta.icon}</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"/>
          {product.is_featured && (
            <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">🔥 Featured</span>
          )}
          {!store.is_open && (
            <span className="absolute top-3 right-3 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">Store Closed</span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-black text-gray-900 text-sm mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">{product.name}</h3>

          {product.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2">{product.description}</p>
          )}

          {/* Category-specific badges */}
          {category==='food' && product.prep_time_min && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2"><Clock className="w-3 h-3"/>{product.prep_time_min} min</div>
          )}
          {category==='real_estate' && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
              {product.property_type && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold capitalize">{product.property_type}</span>}
              {product.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3"/>{product.bedrooms}</span>}
              {product.bathrooms && <span className="flex items-center gap-1"><Bath className="w-3 h-3"/>{product.bathrooms}</span>}
              {product.area_sqm && <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3"/>{product.area_sqm}m²</span>}
            </div>
          )}
          {category==='fashion' && (product.sizes?.length>0 || product.colors?.length>0) && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 flex-wrap">
              {product.sizes?.length>0 && <span className="flex items-center gap-1"><Tag className="w-3 h-3"/>{product.sizes.slice(0,3).join(', ')}{product.sizes.length>3?'...':''}</span>}
            </div>
          )}

          <div className="mt-auto">
            <div className="font-black text-orange-600 text-base mb-2">₦{product.price.toLocaleString()}</div>

            {/* Store info footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
              {store.logo_url
                ? <img src={store.logo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0"/>
                : <div className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0"/>
              }
              <span className="text-xs text-gray-500 font-semibold truncate flex-1">{store.name}</span>
              <span className="flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{store.rating?.toFixed(1) ?? '0.0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
