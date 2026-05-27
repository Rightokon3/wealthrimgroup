'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, MessageSquare, Star, PlusCircle,
  Eye, Edit3, ToggleLeft, ToggleRight, Check, X, Clock,
  ChevronRight, Bell, Settings, LogOut, Store, Phone,
  BarChart3, Users, ArrowUpRight, AlertCircle, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Business } from '@/types/index';

interface Inquiry {
  id: string; customer_name: string; customer_email: string;
  customer_phone?: string; message: string; inquiry_type: string;
  status: string; created_at: string; business_id: string;
  businesses?: { business_name: string };
}

type Tab = 'overview' | 'listings' | 'inquiries' | 'settings';

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  responded: 'bg-green-100 text-green-700 border-green-200',
  closed:    'bg-gray-100 text-gray-500 border-gray-200',
};

export default function VendorDashboardPage() {
  const router  = useRouter();
  const { user, profile, isVendor, isLoggedIn, loading: authLoading, signOut } = useAuth();

  const [tab,        setTab]        = useState<Tab>('overview');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [inquiries,  setInquiries]  = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Auth guard — wait until loading is fully done before deciding
  useEffect(() => {
    if (authLoading) return; // still resolving session + profile, wait
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/vendor/dashboard');
      return;
    }
    // isVendor may still be false for a brief moment if profile is loading
    // Only redirect if we have a profile and it's not vendor
    if (profile !== null && !isVendor) {
      router.replace('/?error=vendor_only');
    }
  }, [authLoading, isLoggedIn, isVendor, profile, router]);

  useEffect(() => {
    if (user && isVendor) fetchData();
  }, [user, isVendor]);

  async function fetchData() {
    setDataLoading(true);
    try {
      const [bizRes, inqRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('inquiries').select('*, businesses(business_name)').in(
          'business_id',
          (await supabase.from('businesses').select('id').eq('user_id', user!.id)).data?.map(b => b.id) ?? []
        ).order('created_at', { ascending: false }).limit(50),
      ]);
      setBusinesses(bizRes.data ?? []);
      setInquiries(inqRes.data ?? []);
    } finally {
      setDataLoading(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('businesses').update({ is_active: !current }).eq('id', id).eq('user_id', user!.id);
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_active: !current } : b));
  }

  async function deleteBusiness(id: string) {
    await supabase.from('businesses').delete().eq('id', id).eq('user_id', user!.id);
    setBusinesses(prev => prev.filter(b => b.id !== id));
    setDeleteConfirm(null);
  }

  async function updateInquiryStatus(id: string, status: string) {
    await supabase.from('inquiries').update({ status }).eq('id', id);
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  // Show spinner while auth is loading OR while we have a user but no profile yet
  if (authLoading || (isLoggedIn && profile === null)) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;
  const avgRating    = businesses.length ? (businesses.reduce((s, b) => s + b.rating, 0) / businesses.length).toFixed(1) : '—';

  const STATS = [
    { label: 'My Listings',       value: businesses.length,             icon: <Store className="w-5 h-5" />,        color: 'from-orange-500 to-red-500' },
    { label: 'Pending Inquiries', value: pendingCount,                  icon: <MessageSquare className="w-5 h-5" />, color: 'from-amber-500 to-yellow-500' },
    { label: 'Avg. Rating',       value: avgRating,                     icon: <Star className="w-5 h-5" />,          color: 'from-rose-500 to-pink-500' },
    { label: 'Total Reviews',     value: businesses.reduce((s,b)=>s+b.total_reviews,0), icon: <Users className="w-5 h-5" />, color: 'from-blue-500 to-indigo-500' },
  ];

  const NAV: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview',  label: 'Overview',    icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'listings',  label: 'My Listings', icon: <Package className="w-4 h-4" />,        badge: businesses.length },
    { id: 'inquiries', label: 'Inquiries',   icon: <MessageSquare className="w-4 h-4" />,  badge: pendingCount || undefined },
    { id: 'settings',  label: 'Settings',    icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-gray-950 text-white flex flex-col sticky top-[64px] h-[calc(100vh-64px)]">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-black text-white">
              {profile?.full_name?.charAt(0).toUpperCase() ?? 'V'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{profile?.full_name ?? 'Vendor'}</div>
              <div className="text-xs text-amber-400 font-semibold">🏪 Vendor Account</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === item.id ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${tab === item.id ? 'bg-white/20' : 'bg-orange-500 text-white'}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link href="/vendor/listings/new" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-orange-400 hover:bg-gray-800 transition-all">
            <PlusCircle className="w-4 h-4" /> New Listing
          </Link>
          <button onClick={async () => { await signOut(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-800 hover:text-white transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-black text-gray-900 capitalize">{tab}</h1>
            <p className="text-xs text-gray-400">{tab === 'overview' ? 'Your business at a glance' : tab === 'listings' ? `${businesses.length} listings` : tab === 'inquiries' ? `${pendingCount} pending` : 'Account settings'}</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Bell className="w-3.5 h-3.5" />{pendingCount} pending
              </div>
            )}
            <Link href="/vendor/listings/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200">
              <PlusCircle className="w-4 h-4" /> Add Listing
            </Link>
          </div>
        </div>

        <div className="p-6">
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>{s.icon}</div>
                    <div className="text-2xl font-black text-gray-900 mb-1">{s.value}</div>
                    <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Recent inquiries */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h3 className="font-black text-gray-900 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-orange-500" /> Recent Inquiries</h3>
                  <button onClick={() => setTab('inquiries')} className="text-xs text-orange-500 font-bold hover:text-orange-700 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                </div>
                {inquiries.slice(0, 5).map(inq => (
                  <div key={inq.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                        {inq.customer_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{inq.customer_name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[220px]">{inq.message}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[inq.status]}`}>{inq.status}</span>
                      <span className="text-xs text-gray-400">{new Date(inq.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {inquiries.length === 0 && <div className="py-8 text-center text-gray-400 text-sm">No inquiries yet.</div>}
              </div>

              {/* My listings preview */}
              {businesses.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="font-black text-gray-900 flex items-center gap-2"><Store className="w-4 h-4 text-orange-500" /> My Listings</h3>
                    <button onClick={() => setTab('listings')} className="text-xs text-orange-500 font-bold hover:text-orange-700 flex items-center gap-1">Manage <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  {businesses.slice(0, 3).map(biz => (
                    <div key={biz.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        {biz.cover_image_url ? <img src={biz.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-300">{biz.business_name.charAt(0)}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-900 truncate">{biz.business_name}</div>
                        <div className="text-xs text-gray-400">⭐ {biz.rating.toFixed(1)} · {biz.total_reviews} reviews · {biz.city}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${biz.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{biz.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LISTINGS ── */}
          {tab === 'listings' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Link href="/vendor/listings/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all">
                  <PlusCircle className="w-4 h-4" /> New Listing
                </Link>
              </div>

              {dataLoading ? (
                [1,2,3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-4 border border-gray-100 h-20" />)
              ) : businesses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <Store className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-black text-gray-700 mb-2">No listings yet</h3>
                  <p className="text-gray-400 text-sm mb-5">Create your first listing to start receiving inquiries.</p>
                  <Link href="/vendor/listings/new" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">Create First Listing</Link>
                </div>
              ) : businesses.map(biz => (
                <div key={biz.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {biz.cover_image_url ? <img src={biz.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xl text-gray-300">{biz.business_name.charAt(0)}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-black text-gray-900 truncate">{biz.business_name}</h3>
                      {biz.is_verified && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Verified</span>}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{biz.category?.replace('_',' ')} · {biz.city}, {biz.country} · ⭐ {biz.rating.toFixed(1)} ({biz.total_reviews})</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${biz.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{biz.is_active ? 'Active' : 'Inactive'}</span>
                    <Link href={`/businesses/${biz.id}`} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-colors"><Eye className="w-4 h-4" /></Link>
                    <Link href={`/vendor/listings/${biz.id}/edit`} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></Link>
                    <button onClick={() => toggleActive(biz.id, biz.is_active)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${biz.is_active ? 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-500' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}>
                      {biz.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setDeleteConfirm(biz.id)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}

              {/* Delete confirm modal */}
              <AnimatePresence>
                {deleteConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-500" /></div>
                      <h3 className="font-black text-gray-900 text-center mb-2">Delete Listing?</h3>
                      <p className="text-gray-500 text-sm text-center mb-5">This will permanently delete the listing and all its data. This cannot be undone.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={() => deleteBusiness(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">Delete</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── INQUIRIES ── */}
          {tab === 'inquiries' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {['all','pending','responded','closed'].map(s => (
                  <span key={s} className="px-4 py-1.5 rounded-full text-sm font-bold bg-white border border-gray-200 text-gray-600 capitalize">
                    {s} {s === 'all' ? `(${inquiries.length})` : s === 'pending' ? `(${pendingCount})` : ''}
                  </span>
                ))}
              </div>

              {dataLoading ? (
                [1,2,3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-gray-100 h-24" />)
              ) : inquiries.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-black text-gray-700 mb-2">No inquiries yet</h3>
                  <p className="text-gray-400 text-sm">Customer inquiries will appear here.</p>
                </div>
              ) : inquiries.map(inq => (
                <div key={inq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black flex-shrink-0">{inq.customer_name.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-gray-900">{inq.customer_name}</h4>
                        <div className="text-xs text-gray-400">{inq.customer_email}{inq.customer_phone && ` · ${inq.customer_phone}`}</div>
                        {inq.businesses?.business_name && <div className="text-xs text-orange-500 font-semibold mt-0.5">Re: {inq.businesses.business_name}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[inq.status]}`}>{inq.status}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(inq.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-700 leading-relaxed">{inq.message}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded-lg capitalize">{inq.inquiry_type?.replace('_',' ')}</span>
                    <div className="ml-auto flex gap-2">
                      {inq.status === 'pending' && (
                        <button onClick={() => updateInquiryStatus(inq.id, 'responded')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600"><Check className="w-3 h-3" /> Responded</button>
                      )}
                      {inq.status !== 'closed' && (
                        <button onClick={() => updateInquiryStatus(inq.id, 'closed')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"><X className="w-3 h-3" /> Close</button>
                      )}
                      {inq.customer_phone && (
                        <a href={`tel:${inq.customer_phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold hover:bg-orange-100"><Phone className="w-3 h-3" /> Call</a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="max-w-xl space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Profile Settings</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Full Name',     value: profile?.full_name   ?? '', field: 'full_name' },
                    { label: 'Phone Number',  value: profile?.phone       ?? '', field: 'phone' },
                    { label: 'City',          value: profile?.city        ?? '', field: 'city' },
                    { label: 'Country',       value: profile?.country     ?? '', field: 'country' },
                  ].map(f => (
                    <div key={f.field}>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{f.label}</label>
                      <input type="text" defaultValue={f.value} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Email</label>
                    <input type="email" value={user?.email ?? ''} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all">Save Changes</button>
                </div>
              </div>
              <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-red-800 mb-1">Danger Zone</h4>
                    <p className="text-sm text-red-600 mb-3">Deleting your account will permanently remove all listings and data.</p>
                    <button className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">Delete Account</button>
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
