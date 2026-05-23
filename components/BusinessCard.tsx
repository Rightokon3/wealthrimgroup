'use client';

import Link from 'next/link';
import { Star, MapPin, Clock, Bike, Building2, Utensils, Shirt } from 'lucide-react';
import { Business } from '@/types';

interface BusinessCardProps {
  business: Business;
}

export default function BusinessCard({ business }: BusinessCardProps) {
  const getCategoryIcon = () => {
    switch (business.category) {
      case 'food_delivery':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'fashion':
        return <Shirt className="w-3.5 h-3.5" />;
      case 'real_estate':
        return <Building2 className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryStyle = () => {
    switch (business.category) {
      case 'food_delivery':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'fashion':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'real_estate':
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getCategoryLabel = () => {
    switch (business.category) {
      case 'food_delivery': return 'Food & Delivery';
      case 'fashion': return 'Fashion';
      case 'real_estate': return 'Real Estate';
    }
  };

  return (
    <Link href={`/businesses/${business.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-orange-100/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        {/* Image */}
        <div className="relative h-44 overflow-hidden">
          {business.cover_image_url ? (
            <img
              src={business.cover_image_url}
              alt={business.business_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              <span className="text-5xl font-black text-orange-200">
                {business.business_name.charAt(0)}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border backdrop-blur-sm bg-white/90 ${getCategoryStyle()}`}>
              {getCategoryIcon()}
              {getCategoryLabel()}
            </span>
          </div>

          {/* Verified badge */}
          {business.is_verified && (
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white flex items-center gap-1">
                ✓ Verified
              </span>
            </div>
          )}

          {/* Delivery info pill (for food) */}
          {business.category === 'food_delivery' && (
            <div className="absolute bottom-3 left-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                <Bike className="w-3 h-3" />
                <span>30–45 min</span>
                <span className="opacity-60">•</span>
                <span>₦500 delivery</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-1.5">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
              {business.business_name}
            </h3>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-gray-800">{business.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({business.total_reviews})</span>
            </div>
          </div>

          <p className="text-gray-500 text-xs mb-3 line-clamp-2 leading-relaxed">
            {business.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{business.city}, {business.country}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Open now</span>
            </div>
          </div>
        </div>

        {/* CTA strip */}
        <div className="px-4 pb-4">
          <div className="w-full py-2 rounded-xl bg-orange-50 border border-orange-100 text-center text-xs font-semibold text-orange-600 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all duration-200">
            Order Now
          </div>
        </div>
      </div>
    </Link>
  );
}
