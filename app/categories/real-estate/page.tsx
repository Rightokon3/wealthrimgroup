'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, BedDouble, Bath, Maximize2, MapPin, TrendingUp, Home, Key, Landmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/index';
import BusinessFilter from '@/components/BusinessFilter';
import Link from 'next/link';
import { Star } from 'lucide-react';

const PROPERTY_TYPES = [
  { label: '🏠 All Properties', value: 'all' },
  { label: '🏡 For Sale', value: 'sale' },
  { label: '🔑 For Rent', value: 'rent' },
  { label: '📋 Lease', value: 'lease' },
  { label: '🏢 Commercial', value: 'commercial' },
  { label: '🏗 New Build', value: 'new_build' },
];

function PropertyCard({ business }: { business: Business }) {
  return (
    <Link href={`/businesses/${business.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-amber-100/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <div className="relative h-52 overflow-hidden">
          {business.cover_image_url ? (
            <img src={business.cover_image_url} alt={business.business_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center">
              <Building2 className="w-16 h-16 text-amber-200" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow">
              For Sale
            </span>
          </div>
          {business.is_verified && (
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">✓ Verified</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div className="bg-black/60 backdrop-blur-sm text-white text-sm font-black px-3 py-1 rounded-xl">
              ₦ 45,000,000
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-gray-900 text-base group-hover:text-amber-600 transition-colors leading-tight">
              {business.business_name}
            </h3>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold">{business.rating.toFixed(1)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <MapPin className="w-3 h-3" />
            <span>{business.city}, {business.country}</span>
          </div>

          {/* Property details pills */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { icon: <BedDouble className="w-3.5 h-3.5" />, label: '4 Beds' },
              { icon: <Bath className="w-3.5 h-3.5" />, label: '3 Baths' },
              { icon: <Maximize2 className="w-3.5 h-3.5" />, label: '220 m²' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
                {item.icon}
                {item.label}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 line-clamp-2 mb-4">{business.description}</p>

          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors">
              Schedule Viewing
            </button>
            <button className="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold hover:from-amber-600 hover:to-yellow-600 transition-all shadow shadow-amber-200">
              Contact Agent
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RealEstatePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState(0);

  useEffect(() => { fetchBusinesses(); }, []);

  async function fetchBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses').select('*')
        .eq('category', 'real_estate').eq('is_active', true)
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
      <div className="relative h-72 md:h-88 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80"
          alt="Real Estate" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/85 via-amber-900/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8 w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-amber-200 text-sm font-bold uppercase tracking-widest">Category</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Real Estate</h1>
              <p className="text-amber-100 text-lg max-w-xl mb-5">
                Find your dream home, rental property, or investment across Africa.
              </p>
              <div className="flex items-center gap-6">
                {[
                  { icon: <Home className="w-4 h-4" />, label: `${businesses.length || '200'}+ Properties` },
                  { icon: <Key className="w-4 h-4" />, label: 'Sales & Rentals' },
                  { icon: <Landmark className="w-4 h-4" />, label: 'Verified Agents' },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-1.5 text-amber-100 text-sm font-medium">
                    {stat.icon}<span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Type filter bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[64px] z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto">
            {PROPERTY_TYPES.map((t, i) => (
              <button key={t.label} onClick={() => setActiveType(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeType === i
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-amber-50 border-b border-amber-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-3 flex items-center gap-8">
          {[
            { label: 'Avg. Sale Price', value: '₦42M' },
            { label: 'Avg. Rent/mo', value: '₦350K' },
            { label: 'New Listings', value: '+24 this week' },
          ].map(stat => (
            <div key={stat.label} className="text-sm">
              <span className="text-amber-600 font-black">{stat.value}</span>
              <span className="text-gray-500 ml-1.5">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <BusinessFilter onFilter={handleFilter} />
            {/* Price range extra filter */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Price Range</h4>
              <div className="space-y-2">
                {['Under ₦10M', '₦10M – ₦30M', '₦30M – ₦100M', '₦100M+'].map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-amber-600">
                    <input type="checkbox" className="accent-amber-500 w-4 h-4" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-gray-700 font-semibold text-sm">{filteredBusinesses.length} properties found</span>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:border-amber-400 outline-none bg-white">
                  <option>Sort: Newest</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Top Rated</option>
                </select>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                  <button className="px-3 py-2 bg-amber-500 text-white text-xs font-bold">Grid</button>
                  <button className="px-3 py-2 bg-white text-gray-500 text-xs font-bold hover:bg-gray-50">List</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden border border-gray-100">
                    <div className="h-52 bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                      <div className="h-8 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1">No properties found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {filteredBusinesses.map((business, i) => (
                  <motion.div key={business.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}>
                    <PropertyCard business={business} />
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
