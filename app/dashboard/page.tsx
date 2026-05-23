'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, MessageSquare, Star, TrendingUp,
  PlusCircle, Eye, Edit3, Trash2, Check, X, Clock,
  ChevronRight, Bell, Settings, LogOut, Store, Phone,
  BarChart3, Users, ArrowUpRight, ArrowDownRight, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/index';

interface Inquiry {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  message: string;
  inquiry_type: string;
  status: string;
  created_at: string;
  business_id: string;
}

type Tab = 'overview' | 'listings' | 'inquiries' | 'reviews' | 'settings';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  responded: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      // In a real app, filter by auth.uid(). Here we load all as demo.
      const [biz, inq] = await Promise.all([
        supabase.from('businesses').select('*').eq('is_active', true).limit(10),
        supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      setBusinesses(biz.data || []);
      setInquiries(inq.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateInquiryStatus(id: string, status: string) {
    await supabase.from('inquiries').update({ status }).eq('id', id);
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  async function toggleBusinessActive(id: string, current: boolean) {
    await supabase.from('businesses').update({ is_active: !current }).eq('id', id);
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b));
  }

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;
  const totalRating = businesses.length
    ? (businesses.reduce((s, b) => s + b.rating, 0) / businesses.length).toFixed(1)
    : '—';
  const totalReviews = businesses.reduce((s, b) => s + b.total_reviews, 0);

  const STATS = [
    { label: 'Total Listings', value: businesses.length, icon: <Store className="w-5 h-5" />, color: 'from-orange-500 to-red-500', change: '+2 this month', up: true },
    { label: 'Pending Inquiries', value: pendingCount, icon: <MessageSquare className="w-5 h-5" />, color: 'from-amber-500 to-yellow-500', change: `${inquiries.length} total`, up: pendingCount > 0 },
    { label: 'Avg. Rating', value: totalRating, icon: <Star className="w-5 h-5" />, color: 'from-rose-500 to-pink-500', change: `${totalReviews} reviews`, up: true },
    { label: 'Profile Views', value: '1,240', icon: <Eye className="w-5 h-5" />, color: 'from-blue-500 to-indigo-500', change: '+18% this week', up: true },
  ];

  const NAV = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'listings', label: 'My Listings', icon: <Package className="w-4 h-4" />, badge: businesses.length },
    { id: 'inquiries', label: 'Inquiries', icon: <MessageSquare className="w-4 h-4" />, badge: pendingCount || undefined },
    { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-gray-950 text-white flex flex-col transition-all duration-300 sticky top-[64px] h-[calc(100vh-64px)]`}>
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">Vendor Dashboard</div>
              <div className="text-xs text-gray-500">Manage your business</div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}>
              <span className="flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link href="/list-business"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-orange-400 hover:bg-gray-800 transition-all">
            <PlusCircle className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Add New Listing'}
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-800 hover:text-white transition-all">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-black text-gray-900 capitalize">{activeTab}</h1>
            <p className="text-xs text-gray-400">
              {activeTab === 'overview' && 'Your business performance at a glance'}
              {activeTab === 'listings' && `${businesses.length} active listings`}
              {activeTab === 'inquiries' && `${pendingCount} pending responses`}
              {activeTab === 'reviews' && `${totalReviews} total reviews`}
              {activeTab === 'settings' && 'Manage your account'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Bell className="w-3.5 h-3.5" />
                {pendingCount} pending
              </div>
            )}
            <Link href="/list-business"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200">
              <PlusCircle className="w-4 h-4" />
              Add Listing
            </Link>
          </div>
        </div>

        <div className="p-6">
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat, i) => (
                  <motion.div key={stat.label}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3`}>
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-500 font-medium mb-2">{stat.label}</div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${stat.up ? 'text-green-600' : 'text-red-500'}`}>
                      {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.change}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Recent inquiries */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h3 className="font-black text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-500" /> Recent Inquiries
                  </h3>
                  <button onClick={() => setActiveTab('inquiries')}
                    className="text-xs text-orange-500 font-bold hover:text-orange-700 flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {inquiries.slice(0, 4).map(inq => (
                    <div key={inq.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-black">
                          {inq.customer_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{inq.customer_name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{inq.message}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[inq.status]}`}>
                          {inq.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(inq.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {inquiries.length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-sm">No inquiries yet.</div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: <PlusCircle className="w-5 h-5" />, label: 'Add New Listing', desc: 'List a new business or property', href: '/list-business', color: 'text-orange-600 bg-orange-50 border-orange-200' },
                  { icon: <BarChart3 className="w-5 h-5" />, label: 'View Analytics', desc: 'See detailed performance stats', href: '#', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                  { icon: <Users className="w-5 h-5" />, label: 'Manage Inquiries', desc: `${pendingCount} awaiting response`, href: '#', color: 'text-amber-600 bg-amber-50 border-amber-200' },
                ].map(action => (
                  <Link key={action.label} href={action.href}
                    onClick={() => action.href === '#' && setActiveTab('inquiries')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border ${action.color} hover:shadow-md transition-all`}>
                    <div className="mt-0.5">{action.icon}</div>
                    <div>
                      <div className="font-bold text-sm">{action.label}</div>
                      <div className="text-xs opacity-70">{action.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── LISTINGS ── */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="animate-pulse bg-white rounded-2xl p-4 border border-gray-100 h-20" />
                  ))}
                </div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <Store className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-black text-gray-700 mb-2">No listings yet</h3>
                  <p className="text-gray-400 text-sm mb-5">Start by listing your first business.</p>
                  <Link href="/list-business"
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">
                    List Your Business
                  </Link>
                </div>
              ) : (
                businesses.map(biz => (
                  <div key={biz.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {biz.cover_image_url
                        ? <img src={biz.cover_image_url} alt={biz.business_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-xl">{biz.business_name.charAt(0)}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-black text-gray-900 truncate">{biz.business_name}</h3>
                        {biz.is_verified && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Verified</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="capitalize">{biz.category?.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{biz.city}, {biz.country}</span>
                        <span>·</span>
                        <span>⭐ {biz.rating.toFixed(1)} ({biz.total_reviews})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${biz.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {biz.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Link href={`/businesses/${biz.id}`}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleBusinessActive(biz.id, biz.is_active)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${biz.is_active ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}>
                        {biz.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── INQUIRIES ── */}
          {activeTab === 'inquiries' && (
            <div className="space-y-4">
              {/* Filter tabs */}
              <div className="flex gap-2">
                {['all', 'pending', 'responded', 'closed'].map(s => (
                  <button key={s} className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-all capitalize">
                    {s} {s === 'pending' && pendingCount > 0 && `(${pendingCount})`}
                  </button>
                ))}
              </div>

              {inquiries.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-black text-gray-700 mb-2">No inquiries yet</h3>
                  <p className="text-gray-400 text-sm">Inquiries from customers will appear here.</p>
                </div>
              ) : (
                inquiries.map(inq => (
                  <div key={inq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black">
                          {inq.customer_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900">{inq.customer_name}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{inq.customer_email}</span>
                            {inq.customer_phone && <><span>·</span><span>{inq.customer_phone}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[inq.status]}`}>
                          {inq.status}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(inq.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-gray-700 leading-relaxed">{inq.message}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 capitalize border border-gray-200 px-2 py-1 rounded-lg">
                        {inq.inquiry_type?.replace('_', ' ')}
                      </span>
                      <div className="ml-auto flex gap-2">
                        {inq.status === 'pending' && (
                          <button onClick={() => updateInquiryStatus(inq.id, 'responded')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors">
                            <Check className="w-3 h-3" /> Mark Responded
                          </button>
                        )}
                        {inq.status !== 'closed' && (
                          <button onClick={() => updateInquiryStatus(inq.id, 'closed')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors">
                            <X className="w-3 h-3" /> Close
                          </button>
                        )}
                        <a href={`tel:${inq.customer_phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold hover:bg-orange-100 transition-colors">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── REVIEWS ── */}
          {activeTab === 'reviews' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
                <div>
                  <div className="text-3xl font-black text-gray-900">{totalRating}</div>
                  <div className="text-sm text-gray-500">{totalReviews} total reviews across all listings</div>
                </div>
              </div>
              <div className="text-center py-12 text-gray-400">
                <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="font-medium">Per-listing reviews appear in each business detail page.</p>
                <p className="text-sm mt-1">Visit your listings to see individual reviews.</p>
                <button onClick={() => setActiveTab('listings')}
                  className="mt-4 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors">
                  Go to Listings
                </button>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Account Settings</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Display Name', value: 'Vendor Account', type: 'text' },
                    { label: 'Email Address', value: 'vendor@africart.com', type: 'email' },
                    { label: 'Phone Number', value: '+234 800 000 0000', type: 'tel' },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{field.label}</label>
                      <input type={field.type} defaultValue={field.value}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white" />
                    </div>
                  ))}
                  <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all">
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-red-800 mb-1">Danger Zone</h4>
                    <p className="text-sm text-red-600 mb-3">Deleting your account will permanently remove all your listings and data.</p>
                    <button className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
