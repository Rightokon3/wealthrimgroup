'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Clock, Star, ChevronRight, ShoppingCart,
  Utensils, Home as HomeIcon, Shirt, Shield, Zap, TrendingUp,
  ArrowRight, Store as StoreIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Store, CATEGORY_META, StoreCategory } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { Business } from '@/types';
import { BusinessCategory } from '@/types';

const CATEGORIES: { value: StoreCategory; emoji: string; label: string; bg: string; text: string }[] = [
  { value:'food',        emoji:'🍛', label:'Food & Delivery',  bg:'bg-orange-50 border-orange-200', text:'text-orange-700' },
  { value:'real_estate', emoji:'🏠', label:'Real Estate',       bg:'bg-amber-50 border-amber-200',   text:'text-amber-700' },
  { value:'fashion',     emoji:'👗', label:'Fashion & Fabric',  bg:'bg-rose-50 border-rose-200',     text:'text-rose-700' },
];

const CITIES = ['Lagos','Abuja','Port Harcourt','Ibadan','Kano','Accra','Nairobi'];

const STATS = [
  { value: '400+', label: 'Active Vendors' },
  { value: '12K+', label: 'Happy Customers' },
  { value: '6', label: 'African Cities' },
  { value: '4.8★', label: 'Average Rating' },
];

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80',
];

function StoreCard({ store }: { store: Store }) {
  const meta = CATEGORY_META[store.category];
  return (
    <Link href={`/store/${store.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-orange-100/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <div className="relative h-40 overflow-hidden">
          {store.cover_url
            ? <img src={store.cover_url} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
            : <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-5xl`}>{meta.icon}</div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"/>
          {!store.is_open && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">Closed</span>
            </div>
          )}
          {store.logo_url && (
            <img src={store.logo_url} alt="" className="absolute bottom-3 left-3 w-10 h-10 rounded-xl border-2 border-white shadow-lg object-cover"/>
          )}
          {store.is_verified && (
            <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3"/>Verified
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-black text-gray-900 text-sm mb-1 group-hover:text-orange-600 transition-colors truncate">{store.name}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 flex-wrap">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/>{store.rating.toFixed(1)} ({store.total_reviews})</span>
            {store.category==='food' && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{store.avg_delivery_min}–{store.avg_delivery_min+15} min</span>}
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{store.city}</span>
          </div>
          <div className={`w-full py-2 rounded-xl text-center text-xs font-black transition-all border
            ${store.category==='food'      ? 'bg-orange-50 text-orange-600 border-orange-100 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500'
            : store.category==='real_estate'? 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500'
            : 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500'}`}>
            {meta.orderLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { totalItems } = useCart();
  const [search,   setSearch]   = useState('');
  const [city,     setCity]     = useState('');
  const [activeCat,setActiveCat]= useState<StoreCategory|'all'>('all');
  const [stores,   setStores]   = useState<Store[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeHero, setActiveHero] = useState(0);
   const [featuredFood, setFeaturedFood] = useState<Business[]>([]);
  const [featuredFashion, setFeaturedFashion] = useState<Business[]>([]);
  const [featuredRealEstate, setFeaturedRealEstate] = useState<Business[]>([]);

  useEffect(() => { fetchStores(); }, [city, activeCat]);

  useEffect(() => {
    fetchFeatured();
    const interval = setInterval(() => setActiveHero(h => (h + 1) % 3), 5000);
    return () => clearInterval(interval);
  }, []);

    async function fetchFeatured() {
    try {
      const [food, fashion, realestate] = await Promise.all([
        supabase.from('businesses').select('*').eq('category', 'food_delivery').eq('is_active', true).order('rating', { ascending: false }).limit(4),
        supabase.from('businesses').select('*').eq('category', 'fashion').eq('is_active', true).order('rating', { ascending: false }).limit(4),
        supabase.from('businesses').select('*').eq('category', 'real_estate').eq('is_active', true).order('rating', { ascending: false }).limit(4),
      ]);
      setFeaturedFood(food.data || []);
      setFeaturedFashion(fashion.data || []);
      setFeaturedRealEstate(realestate.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }


  async function fetchStores() {
    setLoading(true);
    let q = supabase.from('stores').select('*').eq('is_active', true).order('rating', { ascending:false });
    if (activeCat !== 'all') q = q.eq('category', activeCat);
    if (city) q = q.ilike('city', `%${city}%`);
    const { data, error } = await q.limit(24);
    if (error) console.error('fetchStores error:', error);
    setStores(data ?? []);
    setLoading(false);
  }

  const filtered = stores.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative h-[580px] md:h-[640px] overflow-hidden">
        {HERO_IMAGES.map((img, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === activeHero ? 'opacity-100' : 'opacity-0'}`}>
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-200 text-sm font-semibold mb-5 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5" /> Africa's fastest-growing marketplace
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight">
              Shop Local,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                Support Africa
              </span>
            </h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto mb-10">
              Discover food, fashion & real estate from trusted local vendors. Fast delivery, verified businesses.
            </p>

            {/* Search bar */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-2 shadow-2xl max-w-2xl w-full mx-auto">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search for food, fashion, properties..."
                  className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <div className="hidden sm:flex items-center gap-1 px-3 border-l border-gray-200">
                <MapPin className="w-4 h-4 text-orange-500" />
                <select className="text-sm text-gray-600 outline-none bg-transparent">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Link
                href={`/businesses?search=${search}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-300/50 whitespace-nowrap"
              >
                Search <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Hero dot nav */}
          <div className="absolute bottom-6 flex gap-2">
            {HERO_IMAGES.map((_, i) => (
              <button key={i} onClick={() => setActiveHero(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeHero ? 'bg-orange-400 w-6' : 'bg-white/50'}`} />
            ))}
          </div>
        </div>
      </section>
          <section className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-5 ">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black">{stat.value}</div>
                <div className="text-orange-100 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative hidden">
        {/* <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"/>
          <div className="absolute bottom-0 right-20 w-48 h-48 bg-white/5 rounded-full blur-3xl"/>
        </div> */}
        <div className="relative max-w-[1200px] mx-auto px-6 py-14 text-center">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}}>
            {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-sm font-semibold mb-5 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-amber-300"/> Africa's unified marketplace
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-3 leading-tight">
              Food · Homes · Fashion<br/>
              <span className="text-amber-300">Delivered to You</span>
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Order food, browse properties, shop fashion — all from local African vendors.
            </p> */}

             {/* ── STATS BAR ────────────────────────────── */}
  

            {/* Search bar */}
            {/* <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl max-w-2xl mx-auto">
              <div className="flex items-center gap-2 flex-1 px-3">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search stores, food, properties, fashion..."
                  className="w-full text-sm outline-none text-gray-700 placeholder:text-gray-400"/>
              </div>
              <div className="flex items-center gap-1.5 px-3 border-l border-gray-200">
                <MapPin className="w-4 h-4 text-orange-500"/>
                <select value={city} onChange={e=>setCity(e.target.value)}
                  className="text-sm text-gray-600 outline-none bg-transparent">
                  <option value="">All Cities</option>
                  {CITIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <button className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all whitespace-nowrap">
                Search
              </button>
            </div> */}
          </motion.div>
        </div>

        {/* Wave */}
        {/* <div className="relative h-8 overflow-hidden">
          <svg viewBox="0 0 1200 32" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C300,0 900,0 1200,32 L1200,32 L0,32 Z" fill="rgb(249,250,251)"/>
          </svg>
        </div> */}
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-8">

        {/* Category filter pills */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          <button onClick={()=>setActiveCat('all')}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black border-2 transition-all ${activeCat==='all'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            All
          </button>
          {CATEGORIES.map(c=>(
            <button key={c.value} onClick={()=>setActiveCat(c.value)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black border-2 transition-all ${activeCat===c.value?`${c.bg} ${c.text} border-current shadow-md`:`bg-white text-gray-600 border-gray-200 hover:${c.bg}`}`}>
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon:'🍛', label:'Food Vendors', value:stores.filter(s=>s.category==='food').length },
            { icon:'🏠', label:'Properties',   value:stores.filter(s=>s.category==='real_estate').length },
            { icon:'👗', label:'Fashion Shops',value:stores.filter(s=>s.category==='fashion').length },
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Store grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1,2,3,4,5,6,7,8].map(i=>(
              <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-40 bg-gray-200"/>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"/>
                  <div className="h-3 bg-gray-200 rounded w-1/2"/>
                  <div className="h-8 bg-gray-200 rounded-xl"/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <StoreIcon className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
            <h3 className="font-black text-gray-700 mb-2">No stores found</h3>
            <p className="text-gray-400 text-sm mb-5">Try a different city or category.</p>
            <button onClick={()=>{setSearch('');setActiveCat('all');setCity('');}} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600">Clear filters</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((store,i)=>(
              <motion.div key={store.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*.03}}>
                <StoreCard store={store}/>
              </motion.div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div className="mt-16 bg-gray-950 rounded-3xl p-8 md:p-12 text-white">
          <div className="text-center mb-10">
            <span className="text-orange-400 font-bold text-sm uppercase tracking-widest">Simple & Fast</span>
            <h2 className="text-3xl font-black mt-2 mb-3">How Drovo Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step:'01', icon:'🔍', title:'Browse & Discover', desc:'Find food, properties and fashion from verified local vendors in your city.' },
              { step:'02', icon:'🛒', title:'Add & Order', desc:'Add items to your cart and checkout with your delivery address. 10% platform fee applies.' },
              { step:'03', icon:'🚀', title:'Track & Receive', desc:'Track your order in real-time. Vendor receives 90% after Drovo deducts its 10% fee.' },
            ].map((s,i)=>(
              <div key={i} className="relative bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="text-5xl font-black text-gray-800 absolute top-4 right-5 leading-none">{s.step}</div>
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-black mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Fee explainer */}
          <div className="mt-8 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-5 border border-orange-500/30">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-orange-400"/>
              <span className="font-black text-white">Drovo Fee Structure</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {[
                { label:'Customer Pays', value:'₦10,000', sub:'Full order amount' },
                { label:'Drovo (10%)', value:'₦1,000',  sub:'Platform fee' },
                { label:'Vendor Gets (90%)', value:'₦9,000',  sub:'Paid to vendor' },
              ].map(r=>(
                <div key={r.label} className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="font-black text-white text-xl">{r.value}</div>
                  <div className="text-white font-semibold text-xs mt-0.5">{r.label}</div>
                  <div className="text-white/50 text-xs">{r.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor CTA */}
        <div className="mt-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-black mb-3">Ready to start selling?</h2>
          <p className="text-orange-100 mb-6 max-w-xl mx-auto text-sm">
            Join hundreds of vendors already selling food, properties and fashion on Drovo. Set up your store in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup?role=vendor"
              className="px-8 py-3.5 bg-white text-orange-600 rounded-2xl font-black hover:bg-orange-50 transition-all shadow-xl">
              Start Selling — Free
            </Link>
            <Link href="/auth/login"
              className="px-8 py-3.5 bg-white/15 text-white border border-white/30 rounded-2xl font-bold hover:bg-white/25 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
