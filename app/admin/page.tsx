'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Store, Users, Bike,
  TrendingUp, DollarSign, Clock, CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/types';

interface Stats {
  ordersToday:    number;
  revenueToday:   number;
  gmvTotal:       number;
  activeRiders:   number;
  totalStores:    number;
  totalUsers:     number;
  pendingOrders:  number;
  deliveredTotal: number;
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending','confirmed','preparing','ready','picked_up','on_the_way'];

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { data: ordersToday },
      { data: allOrders },
      { data: riders },
      { count: totalStores },
      { count: totalUsers },
      { data: recent },
    ] = await Promise.all([
      supabase.from('orders').select('total, status').gte('created_at', todayISO),
      supabase.from('orders').select('total, status, platform_fee'),
      supabase.from('riders').select('is_online').eq('is_online', true),
      supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('orders')
        .select('id, order_number, status, total, created_at, stores(name)')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const todayRevenue  = (ordersToday ?? []).filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
    const todayOrders   = (ordersToday ?? []).length;
    const gmv           = (allOrders ?? []).reduce((s, o) => s + o.total, 0);
    const pending       = (allOrders ?? []).filter(o => ACTIVE_STATUSES.includes(o.status as OrderStatus)).length;
    const delivered     = (allOrders ?? []).filter(o => o.status === 'delivered').length;

    setStats({
      ordersToday:    todayOrders,
      revenueToday:   todayRevenue,
      gmvTotal:       gmv,
      activeRiders:   riders?.length ?? 0,
      totalStores:    totalStores ?? 0,
      totalUsers:     totalUsers ?? 0,
      pendingOrders:  pending,
      deliveredTotal: delivered,
    });
    setRecentOrders(recent ?? []);
    setLoading(false);
  }

  const STAT_CARDS = stats ? [
    { label: 'Orders Today',    value: stats.ordersToday,                          icon: <ShoppingBag className="w-5 h-5" />, color: 'from-blue-500 to-indigo-500' },
    { label: 'Revenue Today',   value: `₦${stats.revenueToday.toLocaleString()}`,  icon: <DollarSign className="w-5 h-5" />,  color: 'from-green-500 to-emerald-500' },
    { label: 'GMV (All Time)',  value: `₦${stats.gmvTotal.toLocaleString()}`,       icon: <TrendingUp className="w-5 h-5" />,  color: 'from-orange-500 to-red-500' },
    { label: 'Active Riders',   value: stats.activeRiders,                          icon: <Bike className="w-5 h-5" />,        color: 'from-cyan-500 to-blue-500' },
    { label: 'Active Stores',   value: stats.totalStores,                           icon: <Store className="w-5 h-5" />,       color: 'from-violet-500 to-purple-500' },
    { label: 'Total Users',     value: stats.totalUsers,                            icon: <Users className="w-5 h-5" />,       color: 'from-pink-500 to-rose-500' },
    { label: 'Pending Orders',  value: stats.pendingOrders,                         icon: <Clock className="w-5 h-5" />,       color: 'from-amber-500 to-orange-500' },
    { label: 'Total Delivered', value: stats.deliveredTotal,                        icon: <CheckCircle className="w-5 h-5" />, color: 'from-teal-500 to-green-500' },
  ] : [];

  const STATUS_COLOR: Record<string, string> = {
    pending:    'bg-amber-900/40 text-amber-400',
    confirmed:  'bg-blue-900/40 text-blue-400',
    preparing:  'bg-purple-900/40 text-purple-400',
    ready:      'bg-indigo-900/40 text-indigo-400',
    picked_up:  'bg-orange-900/40 text-orange-400',
    on_the_way: 'bg-cyan-900/40 text-cyan-400',
    delivered:  'bg-green-900/40 text-green-400',
    cancelled:  'bg-red-900/40 text-red-400',
    refunded:   'bg-gray-800 text-gray-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Drovo platform overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-800 rounded-2xl h-28 border border-gray-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>
                {s.icon}
              </div>
              <div className="text-2xl font-black text-white mb-1">{s.value}</div>
              <div className="text-xs text-gray-400 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-black text-white">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Store', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-300 font-bold">{o.order_number}</td>
                  <td className="px-5 py-3 text-gray-300">{o.stores?.name ?? '—'}</td>
                  <td className="px-5 py-3 font-bold text-white">₦{o.total.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[o.status] ?? 'bg-gray-800 text-gray-400'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-600 text-sm">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}