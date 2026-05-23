'use client';

import { useState } from 'react';
import { Search, Star, SlidersHorizontal, X } from 'lucide-react';

interface BusinessFilterProps {
  onFilter: (filters: any) => void;
}

export default function BusinessFilter({ onFilter }: BusinessFilterProps) {
  const [filters, setFilters] = useState({
    search: '',
    city: 'all',
    minRating: 0,
  });

  const cities = ['Lagos', 'Accra', 'Nairobi', 'Johannesburg', 'Cairo', 'Abuja', 'Kano'];

  const handleChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearAll = () => {
    const reset = { search: '', city: 'all', minRating: 0 };
    setFilters(reset);
    onFilter(reset);
  };

  const hasActiveFilters = filters.search || filters.city !== 'all' || filters.minRating > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-500" />
          <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:text-orange-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Search */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Search restaurants..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">City</label>
          <select
            value={filters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white appearance-none"
          >
            <option value="all">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Minimum Rating</label>
          <div className="space-y-2">
            {[
              { value: 0, label: 'All ratings' },
              { value: 3, label: '3.0 & above' },
              { value: 4, label: '4.0 & above' },
              { value: 4.5, label: '4.5 & above' },
            ].map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl transition-all ${
                  filters.minRating === value
                    ? 'bg-orange-50 border border-orange-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="rating"
                  checked={filters.minRating === value}
                  onChange={() => handleChange('minRating', value)}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-400 accent-orange-500"
                />
                <div className="flex items-center gap-2 flex-1">
                  {value > 0 ? (
                    <>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{label}</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600">{label}</span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Delivery Type */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Delivery Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['Fast Delivery', 'Free Delivery', 'Pickup', 'Scheduled'].map((type) => (
              <button
                key={type}
                className="py-2 px-3 text-xs font-medium rounded-xl border border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-all"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
