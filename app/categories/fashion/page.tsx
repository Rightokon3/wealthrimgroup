'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Tag, Sparkles, Star, MapPin, TrendingUp, ShoppingBag, Scissors, Gem } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/index';
import BusinessFilter from '@/components/BusinessFilter';
import Link from 'next/link';

const FASHION_TAGS = [
  { label: '👗 All Fashion', value: 'all' },
  { label: '🧵 Ankara & Prints', value: 'ankara' },
  { label: '👔 Men\'s Wear', value: 'men' },
  { label: '👗 Women\'s Wear', value: 'women' },
  { label: '👟 Footwear', value: 'footwear' },
  { label: '💍 Accessories', value: 'accessories' },
  { label: '👶 Kids', value: 'kids' },
  { label: '✂️ Tailoring', value: 'tailoring' },
];

function FashionCard({ business }: { business: Business }) {
  return (
    <Link href={`/businesses/${business.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-rose-100/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <div className="relative h-56 overflow-hidden">
          {business.cover_image_url ? (
            <img src={business.cover_image_url} alt={business.business_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-100 via-pink-50 to-red-50 flex flex-col items-center justify-center gap-2">
              <Shirt className="w-16 h-16 text-rose-200" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-rose-700 border border-rose-200 backdrop-blur-sm flex items-center gap-1">
              <Shirt className="w-3 h-3" /> Fashion
            </span>
          </div>
          {business.is_verified && (
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">✓ Verified</span>
            </div>
          )}

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex gap-1.5">
              {['Ankara', 'Ready-to-wear', 'Custom'].map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-gray-900 text-base group-hover:text-rose-600 transition-colors leading-tight">
              {business.business_name}
            </h3>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold">{business.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({business.total_reviews})</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{business.city}, {business.country}</span>
          </div>

          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{business.description}</p>

          {/* Price range */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">Starting from</span>
            <span className="text-sm font-black text-rose-600">₦5,000</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors">
              View Catalog
            </button>
            <button className="py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold hover:from-rose-600 hover:to-pink-700 transition-all shadow shadow-rose-200">
              Shop Now
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FashionPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState(0);

  useEffect(() => { fetchBusinesses(); }, []);

  async function fetchBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses').select('*')
        .eq('category', 'fashion').eq('is_active', true)
        .order('rating', { ascending: false });
      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleFilter = (filters: any) => {
    let filtered = [...businesses];
    if (filters.search) filtered = filtered.filter(b =>
      b.business_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      b.description.toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.city && filters.city !== 'all') filtered = filtered.filter(b => b.city === filters.city);
    if (filters.minRating) filtered = filtered.filter(b => b.rating >= filters.minRating);
    setFilteredBusinesses(filtered);
  };

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80"
          alt="Fashion" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-rose-950/85 via-rose-800/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8 w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg">
                  <Shirt className="w-6 h-6 text-white" />
                </div>
                <span className="text-rose-200 text-sm font-bold uppercase tracking-widest">Category</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Fashion & Fabric</h1>
              <p className="text-rose-100 text-lg max-w-xl mb-5">
                Discover African prints, contemporary fashion & bespoke tailoring from local designers.
              </p>
              <div className="flex items-center gap-6">
                {[
                  { icon: <ShoppingBag className="w-4 h-4" />, label: `${businesses.length || '150'}+ Vendors` },
                  { icon: <Scissors className="w-4 h-4" />, label: 'Custom & Ready-to-wear' },
                  { icon: <Gem className="w-4 h-4" />, label: 'Authentic African designs' },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-1.5 text-rose-100 text-sm font-medium">
                    {stat.icon}<span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tag filter bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[64px] z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto">
            {FASHION_TAGS.map((tag, i) => (
              <button key={tag.label} onClick={() => setActiveTag(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTag === i
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-600'
                }`}>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature banner */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white py-3">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-pink-200" />
          <span className="text-sm font-semibold">Exclusive Deals</span>
          <span className="text-pink-200 text-sm">Up to 40% off on selected Ankara designs this week</span>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <BusinessFilter onFilter={handleFilter} />
            {/* Extra fashion filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Style</h4>
              <div className="space-y-2">
                {['Traditional', 'Contemporary', 'Fusion', 'Streetwear', 'Bridal'].map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-rose-600">
                    <input type="checkbox" className="accent-rose-500 w-4 h-4" />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-500" />
                <span className="text-gray-700 font-semibold text-sm">{filteredBusinesses.length} vendors found</span>
              </div>
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:border-rose-400 outline-none bg-white">
                <option>Sort: Top Rated</option>
                <option>Sort: Most Popular</option>
                <option>Price: Low to High</option>
              </select>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                    <div className="h-56 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shirt className="w-8 h-8 text-rose-400" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1">No vendors found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBusinesses.map((business, i) => (
                  <motion.div key={business.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}>
                    <FashionCard business={business} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
