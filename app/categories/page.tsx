'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Utensils, Shirt, Building2, ArrowRight, Star,
  Users, Clock, Shield, TrendingUp, ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'food_delivery',
    label: 'Food Delivery',
    tagline: 'From street food to fine dining',
    desc: 'Order from local restaurants, cafes, bakeries, and home chefs. Fresh African cuisine delivered to your door.',
    href: '/categories/food-delivery',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    icon: Utensils,
    gradient: 'from-orange-600 to-red-600',
    lightBg: 'bg-orange-50',
    border: 'border-orange-200',
    accent: 'text-orange-600',
    badgeColor: 'bg-orange-500',
    stats: [
      { label: 'Restaurants', value: '120+' },
      { label: 'Cities', value: '6' },
      { label: 'Avg delivery', value: '35 min' },
    ],
    highlights: ['Local & international cuisine', 'Home-cooked meals', 'Bakeries & pastries', 'Grocery delivery'],
  },
  {
    id: 'fashion',
    label: 'Fashion & Fabric',
    tagline: 'African prints, modern style',
    desc: 'Discover authentic Ankara, Kente, and contemporary African fashion from local designers and tailors.',
    href: '/categories/fashion',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    icon: Shirt,
    gradient: 'from-rose-600 to-pink-600',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    accent: 'text-rose-600',
    badgeColor: 'bg-rose-500',
    stats: [
      { label: 'Vendors', value: '80+' },
      { label: 'Styles', value: '500+' },
      { label: 'Custom orders', value: 'Yes' },
    ],
    highlights: ['Ankara & Kente fabric', 'Ready-to-wear', 'Custom tailoring', 'Accessories & jewellery'],
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    tagline: 'Find your dream property',
    desc: 'Browse homes for sale, apartments for rent, and commercial properties with verified local agents.',
    href: '/categories/real-estate',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    icon: Building2,
    gradient: 'from-amber-500 to-yellow-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'text-amber-600',
    badgeColor: 'bg-amber-500',
    stats: [
      { label: 'Properties', value: '200+' },
      { label: 'Agents', value: '40+' },
      { label: 'Cities', value: '8' },
    ],
    highlights: ['Houses & apartments', 'Commercial spaces', 'Land & plots', 'Verified agents'],
  },
];

const TRUST = [
  { icon: <Shield className="w-5 h-5 text-green-500" />, label: 'Verified vendors', desc: 'All businesses manually reviewed' },
  { icon: <Star className="w-5 h-5 text-amber-400" />, label: 'Genuine reviews', desc: 'Real feedback from real customers' },
  { icon: <Clock className="w-5 h-5 text-orange-500" />, label: 'Fast response', desc: 'Vendors reply within minutes' },
  { icon: <Users className="w-5 h-5 text-blue-500" />, label: '12K+ customers', desc: 'Active community of buyers' },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-sm font-bold mb-5">
              <TrendingUp className="w-3.5 h-3.5" /> Browse Categories
            </span>
            <h1 className="text-5xl md:text-6xl font-black mb-4">
              Everything in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">One Place</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">
              Food, fashion, and real estate — explore Africa's most vibrant local marketplace.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Category cards */}
      <div className="max-w-[1200px] mx-auto px-6 py-16 space-y-8">
        {CATEGORIES.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div key={cat.id}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className={`group bg-white rounded-3xl border-2 ${cat.border} overflow-hidden hover:shadow-2xl transition-all duration-500`}>
                <div className={`grid md:grid-cols-2 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  {/* Image side */}
                  <div className={`relative h-64 md:h-auto overflow-hidden ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                    <img src={cat.image} alt={cat.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-60`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/30">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-3xl font-black mb-2">{cat.label}</h2>
                      <p className="text-white/80 text-sm font-medium">{cat.tagline}</p>
                    </div>
                  </div>

                  {/* Content side */}
                  <div className={`p-8 flex flex-col justify-between ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                    <div>
                      <p className="text-gray-600 leading-relaxed mb-6">{cat.desc}</p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {cat.stats.map(stat => (
                          <div key={stat.label} className={`${cat.lightBg} rounded-xl p-3 text-center border ${cat.border}`}>
                            <div className={`text-xl font-black ${cat.accent}`}>{stat.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Highlights */}
                      <div className="grid grid-cols-2 gap-y-2 mb-8">
                        {cat.highlights.map(h => (
                          <div key={h} className="flex items-center gap-2 text-sm text-gray-600">
                            <div className={`w-1.5 h-1.5 rounded-full ${cat.badgeColor}`} />
                            {h}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href={cat.href}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r ${cat.gradient} hover:shadow-lg transition-all`}>
                        Browse {cat.label} <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link href="/list-business"
                        className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm ${cat.lightBg} ${cat.accent} border ${cat.border} hover:shadow-md transition-all`}>
                        List Here <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Trust strip */}
      <div className="bg-white border-t border-b border-gray-100 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {TRUST.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vendor CTA */}
      <div className="py-16 bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Don't see your category?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
            We're always growing. List your business today and we'll place you in the right category.
          </p>
          <Link href="/list-business"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 rounded-2xl font-black text-lg hover:bg-orange-50 transition-all shadow-xl">
            List Your Business — Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
