'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Utensils, ChefHat, Flame, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/index';
import BusinessCard from '@/components/BusinessCard';
import BusinessFilter from '@/components/BusinessFilter';

const FOOD_HERO_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80';

const CUISINE_TAGS = [
  { label: '🍛 Jollof Rice', active: true },
  { label: '🥩 Suya & BBQ', active: false },
  { label: '🐟 Seafood', active: false },
  { label: '🥗 Healthy', active: false },
  { label: '🍕 Pizza', active: false },
  { label: '🍔 Burgers', active: false },
  { label: '🥘 Stews', active: false },
  { label: '🧁 Pastries', active: false },
];

export default function FoodDeliveryCategoryPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCuisine, setActiveCuisine] = useState(0);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('category', 'food_delivery')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFilter = (filters: any) => {
    let filtered = [...businesses];

    if (filters.search) {
      filtered = filtered.filter(
        (b) =>
          b.business_name.toLowerCase().includes(filters.search.toLowerCase()) ||
          b.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.city && filters.city !== 'all') {
      filtered = filtered.filter((b) => b.city === filters.city);
    }

    if (filters.minRating) {
      filtered = filtered.filter((b) => b.rating >= filters.minRating);
    }

    setFilteredBusinesses(filtered);
  };

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={FOOD_HERO_IMAGE}
          alt="Food Delivery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-red-800/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <span className="text-orange-200 text-sm font-semibold uppercase tracking-widest">
                  Category
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                Food & Delivery
              </h1>
              <p className="text-orange-100 text-lg max-w-xl">
                Authentic African cuisine and more — delivered fast to your door.
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-5">
                {[
                  { icon: <ChefHat className="w-4 h-4" />, label: `${businesses.length || '50'}+ Restaurants` },
                  { icon: <Clock className="w-4 h-4" />, label: '30–45 min avg delivery' },
                  { icon: <Flame className="w-4 h-4" />, label: 'Fresh & local' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-1.5 text-orange-100 text-sm font-medium">
                    {stat.icon}
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Cuisine quick-filter */}
      <div className="bg-white border-b border-gray-100 sticky top-[64px] z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            {CUISINE_TAGS.map((tag, i) => (
              <button
                key={tag.label}
                onClick={() => setActiveCuisine(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeCuisine === i
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <BusinessFilter onFilter={handleFilter} />
          </div>

          {/* Listings */}
          <div className="lg:col-span-3">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-gray-700 font-semibold text-sm">
                  {filteredBusinesses.length} restaurants found
                </span>
              </div>
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:border-orange-400 outline-none bg-white">
                <option>Sort: Top Rated</option>
                <option>Sort: Fastest Delivery</option>
                <option>Sort: Newest</option>
                <option>Sort: Price: Low to High</option>
              </select>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="h-44 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-200 rounded-lg" />
                      <div className="h-3 bg-gray-200 rounded-lg w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1">No restaurants found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {filteredBusinesses.map((business, i) => (
                  <motion.div
                    key={business.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <BusinessCard business={business} />
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
