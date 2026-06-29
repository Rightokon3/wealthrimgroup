'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';

const ALL_STATUSES: OrderStatus[] = [
  'pending','confirmed','preparing','ready',
  'picked_up','on_the_way','delivered','cancelled','refunded'
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:    'bg-amber-900/40 text-amber-400 border-amber-800',
  confirmed:  'bg-blue-900/40 text-blue-400 border-blue-800',
  preparing:  'bg-purple-900/40 text-purple-400 border-purple-800',
  ready:      'bg-indigo-900/40 text-indigo-400 border-indigo-800',
  picked_up:  'bg-orange-900/40 text-orange-400 border-orange-800',
  on_the_way: 'bg-cyan-900/40 text-cyan-400 border-cyan-800',
  delivered:  'bg-green-900/40 text-green-400 border-green-800',
  cancelled:  'bg-red-900/40 text-red-400 border-red-800',
  refunded:   'bg-gray-800 text-gray-500 border-gray-700',
};

export default function AdminOrders() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [filtered,   setFiltered]   = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [updating,   setUpdating]   = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.stores?.name?.toLowerCase().includes(q) ||
        o.delivery_city?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [orders, search, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, stores(name, category), profiles(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders(data ?? []);
    setLoading(false);
  }

  async function overrideStatus(orderId: string, next: OrderStatus) {
    setUpdating(orderId);
    await supabase.from('orders').update({ status: next }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o));
    setUpdating(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} orders</p>
        </div>
        <button onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, store, city..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Customer', 'Store', 'Total', 'Status', 'Date', 'Override'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-gray-800 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600">No orders found.</td></tr>
              ) : filtered.map(o => (
                <motion.tr key={o.id} layout
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300 font-bold whitespace-nowrap">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium text-xs">{o.profiles?.full_name ?? '—'}</div>
                    <div className="text-gray-500 text-xs">{o.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{o.stores?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-black text-white whitespace-nowrap">₦{o.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[o.status]}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={o.status}
                        onChange={e => overrideStatus(o.id, e.target.value as OrderStatus)}
                        disabled={updating === o.id}
                        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs focus:outline-none focus:border-orange-500 disabled:opacity-50 cursor-pointer"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}