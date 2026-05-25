'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, Utensils, Shirt, Building2, Star, ArrowRight,
  MapPin, ShieldCheck, Zap, Users, ChevronRight,
  ShoppingCart, TrendingUp, Award, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/index';
import BusinessCard from '@/components/BusinessCard';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80',
];

const CATEGORIES = [
  {
    id: 'food_delivery',
    label: 'Food Delivery',
    desc: 'Restaurants, cafes & local cuisine',
    href: '/categories/food-delivery',
    icon: Utensils,
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hover: 'hover:border-orange-400',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    count: '120+ restaurants',
  },
  {
    id: 'fashion',
    label: 'Fashion & Fabric',
    desc: 'African prints, clothing & accessories',
    href: '/categories/fashion',
    icon: Shirt,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hover: 'hover:border-rose-400',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    count: '80+ vendors',
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    desc: 'Properties for sale, rent & lease',
    href: '/categories/real-estate',
    icon: Building2,
    color: 'from-amber-500 to-yellow-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hover: 'hover:border-amber-400',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
    count: '200+ properties',
  },
];

const CITIES = ['Lagos', 'Accra', 'Nairobi', 'Johannesburg', 'Cairo', 'Abuja', 'Kano', 'Kumasi'];

const HOW_IT_WORKS_VENDOR = [
  { step: '01', icon: <ShoppingCart className="w-6 h-6" />, title: 'Register Your Business', desc: 'Fill out our simple form with your business details, photos and contact info.' },
  { step: '02', icon: <ShieldCheck className="w-6 h-6" />, title: 'Get Verified', desc: 'Our team reviews your submission and verifies your business within 24 hours.' },
  { step: '03', icon: <Users className="w-6 h-6" />, title: 'Reach Customers', desc: 'Your listing goes live and thousands of customers can find and contact you.' },
];

const HOW_IT_WORKS_BUYER = [
  { step: '01', icon: <Search className="w-6 h-6" />, title: 'Browse & Search', desc: 'Explore hundreds of local vendors across food, fashion and real estate.' },
  { step: '02', icon: <Star className="w-6 h-6" />, title: 'Compare & Review', desc: 'Read reviews, check ratings and compare businesses side by side.' },
  { step: '03', icon: <Zap className="w-6 h-6" />, title: 'Connect & Order', desc: 'Contact the vendor directly or place your order in just a few taps.' },
];

const STATS = [
  { value: '400+', label: 'Active Vendors' },
  { value: '12K+', label: 'Happy Customers' },
  { value: '6', label: 'African Cities' },
  { value: '4.8★', label: 'Average Rating' },
];

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [featuredFood, setFeaturedFood] = useState<Business[]>([]);
  const [featuredFashion, setFeaturedFashion] = useState<Business[]>([]);
  const [featuredRealEstate, setFeaturedRealEstate] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHero, setActiveHero] = useState(0);
  const [activeTab, setActiveTab] = useState<'vendor' | 'buyer'>('buyer');

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

  return (
    <div className="min-h-screen pt-[64px]">

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

      {/* ── STATS BAR ────────────────────────────── */}
      <section className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-5">
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

      {/* ── CATEGORIES ───────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Browse by category</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-3">Everything You Need</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From your next meal to your dream home — all in one place.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.div key={cat.id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Link href={cat.href}>
                    <div className={`group relative rounded-3xl border-2 ${cat.border} ${cat.hover} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer`}>
                      <div className="relative h-52 overflow-hidden">
                        <img src={cat.image} alt={cat.label}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className={`absolute top-4 left-4 w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-xl`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="p-5 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xl font-black text-gray-900">{cat.label}</h3>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{cat.desc}</p>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${cat.bg} ${cat.border} border`}
                          style={{ color: 'inherit' }}>
                          {cat.count}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURED FOOD ────────────────────────── */}
      <section className="py-16 bg-orange-50/50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-white" />
                </div>
                <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Top Picks</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900">Featured Restaurants</h2>
            </div>
            <Link href="/categories/food-delivery"
              className="flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredFood.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <BusinessCard business={b} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED FASHION ─────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center">
                  <Shirt className="w-4 h-4 text-white" />
                </div>
                <span className="text-rose-500 font-bold text-sm uppercase tracking-widest">Trending Now</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900">Fashion Vendors</h2>
            </div>
            <Link href="/categories/fashion"
              className="flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredFashion.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <BusinessCard business={b} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURED REAL ESTATE ─────────────────── */}
      <section className="py-16 bg-amber-50/50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-amber-600 font-bold text-sm uppercase tracking-widest">Prime Listings</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900">Real Estate</h2>
            </div>
            <Link href="/categories/real-estate"
              className="flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredRealEstate.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <BusinessCard business={b} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <section className="py-20 bg-gray-950 text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-orange-400 font-bold text-sm uppercase tracking-widest">Simple & Fast</span>
            <h2 className="text-4xl font-black mt-2 mb-3">How Drovo Works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Whether you're a vendor or a buyer — getting started takes minutes.</p>
            <div className="flex items-center justify-center gap-2 mt-6">
              {(['buyer', 'vendor'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/50'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {tab === 'buyer' ? '🛒 I want to buy' : '🏪 I\'m a vendor'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(activeTab === 'buyer' ? HOW_IT_WORKS_BUYER : HOW_IT_WORKS_VENDOR).map((item, i) => (
              <motion.div key={item.step}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-gray-900 rounded-2xl p-7 border border-gray-800">
                <div className="text-6xl font-black text-gray-800 absolute top-5 right-6 leading-none">{item.step}</div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-5 shadow-lg shadow-orange-900/40">
                  {item.icon}
                </div>
                <h3 className="text-lg font-black mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-700" />
                )}
              </motion.div>
            ))}
          </div>

          {activeTab === 'vendor' && (
            <div className="text-center mt-10">
              <Link href="/list-business"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-xl shadow-orange-900/40">
                List My Business Free <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-gray-500 text-sm mt-3">No commission. No hidden fees. Cancel anytime.</p>
            </div>
          )}
          {activeTab === 'buyer' && (
            <div className="text-center mt-10">
              <Link href="/businesses"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-xl shadow-orange-900/40">
                Browse All Vendors <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── TRUST BADGES ─────────────────────────── */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <ShieldCheck className="w-7 h-7 text-green-500" />, title: 'Verified Vendors', desc: 'Every business is manually reviewed before listing.' },
              { icon: <Star className="w-7 h-7 text-amber-400" />, title: 'Genuine Reviews', desc: 'Real reviews from real customers, no fakes.' },
              { icon: <Clock className="w-7 h-7 text-orange-500" />, title: 'Fast Response', desc: 'Vendors respond within minutes on average.' },
              { icon: <Award className="w-7 h-7 text-rose-500" />, title: 'Quality Assured', desc: 'Top-rated vendors earn quality badges.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VENDOR CTA BANNER ────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Ready to grow your business?</h2>
            <p className="text-orange-100 text-lg max-w-2xl mx-auto mb-10">
              Join 400+ vendors already thriving on AfriCart. List your business today and start receiving inquiries within hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/list-business"
                className="px-8 py-4 bg-white text-orange-600 rounded-2xl font-black text-lg hover:bg-orange-50 transition-all shadow-xl">
                List Your Business — Free
              </Link>
              <Link href="/businesses"
                className="px-8 py-4 bg-white/15 text-white border border-white/30 rounded-2xl font-bold text-lg hover:bg-white/25 transition-all backdrop-blur-sm">
                Browse Businesses
              </Link>
            </div>
            <p className="text-orange-200 text-sm mt-5">No credit card required · Free forever for basic listing</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
