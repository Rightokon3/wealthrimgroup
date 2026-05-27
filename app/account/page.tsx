'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Star, MessageSquare, Settings, Edit3, Camera, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

type Tab = 'profile' | 'reviews' | 'inquiries' | 'settings';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, isLoggedIn, loading: authLoading, updateProfile } = useAuth();

  const [tab,       setTab]       = useState<Tab>('profile');
  const [reviews,   setReviews]   = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', city: '', country: '' });

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace('/auth/login?next=/account');
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '', city: profile.city ?? '', country: profile.country ?? '' });
    }
  }, [profile]);

  useEffect(() => {
    if (user) fetchUserData();
  }, [user]);

  async function fetchUserData() {
    const [revRes, inqRes] = await Promise.all([
      supabase.from('reviews').select('*, businesses(business_name, cover_image_url)').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('inquiries').select('*, businesses(business_name)').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);
    setReviews(revRes.data ?? []);
    setInquiries(inqRes.data ?? []);
  }

  const handleSave = async () => {
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (authLoading || (isLoggedIn && profile === null)) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const TAB_NAV: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'profile',   label: 'My Profile',  icon: <User className="w-4 h-4" /> },
    { id: 'reviews',   label: 'My Reviews',  icon: <Star className="w-4 h-4" />,        count: reviews.length },
    { id: 'inquiries', label: 'Inquiries',   icon: <MessageSquare className="w-4 h-4" />, count: inquiries.length },
    { id: 'settings',  label: 'Settings',    icon: <Settings className="w-4 h-4" /> },
  ];

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="max-w-[900px] mx-auto px-6 py-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-black">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                  : profile?.full_name?.charAt(0).toUpperCase() ?? '?'
                }
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                <Camera className="w-3.5 h-3.5 text-orange-500" />
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-black">{profile?.full_name ?? 'Customer'}</h1>
              <p className="text-orange-100 text-sm">{user?.email}</p>
              <span className="inline-flex mt-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">🛒 Customer Account</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar nav */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {TAB_NAV.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold border-b border-gray-50 last:border-0 transition-all ${tab === item.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${tab === item.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            {/* PROFILE */}
            {tab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2"><Edit3 className="w-4 h-4 text-orange-500" /> Edit Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Email</label>
                    <input type="email" value={user?.email ?? ''} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} placeholder="+234 800 000 0000" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City</label>
                      <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inputClass} placeholder="Lagos" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Country</label>
                    <input type="text" value={form.country} onChange={e => setForm({...form, country: e.target.value})} className={inputClass} placeholder="Nigeria" />
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200 disabled:opacity-60">
                    {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* REVIEWS */}
            {tab === 'reviews' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                    <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <h3 className="font-black text-gray-700 mb-1">No reviews yet</h3>
                    <p className="text-gray-400 text-sm">Browse businesses and leave your first review.</p>
                    <Link href="/businesses" className="inline-flex mt-4 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600">Browse Businesses</Link>
                  </div>
                ) : reviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        {review.businesses?.cover_image_url ? <img src={review.businesses.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black">{review.businesses?.business_name?.charAt(0)}</div>}
                      </div>
                      <div className="flex-1">
                        <Link href={`/businesses/${review.business_id}`} className="font-black text-gray-900 hover:text-orange-600 transition-colors">{review.businesses?.business_name}</Link>
                        <div className="flex items-center gap-1 my-1">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
                          <span className="text-xs text-gray-400 ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* INQUIRIES */}
            {tab === 'inquiries' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {inquiries.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <h3 className="font-black text-gray-700 mb-1">No inquiries sent</h3>
                    <p className="text-gray-400 text-sm">When you contact a business it'll appear here.</p>
                  </div>
                ) : inquiries.map(inq => (
                  <div key={inq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link href={`/businesses/${inq.business_id}`} className="font-black text-gray-900 hover:text-orange-600 transition-colors">{inq.businesses?.business_name}</Link>
                        <div className="text-xs text-gray-400 mt-0.5 capitalize">{inq.inquiry_type?.replace('_',' ')} · {new Date(inq.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        inq.status === 'responded' ? 'bg-green-100 text-green-700 border-green-200' :
                        inq.status === 'closed'    ? 'bg-gray-100 text-gray-500 border-gray-200' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>{inq.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{inq.message}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* SETTINGS */}
            {tab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-black text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">New Password</label>
                      <input type="password" className={inputClass} placeholder="Min. 8 characters" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
                      <input type="password" className={inputClass} placeholder="Repeat password" />
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">Update Password</button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-black text-gray-900 mb-2">Notifications</h3>
                  <p className="text-sm text-gray-500 mb-4">Manage how AfriCart contacts you.</p>
                  {['Email me when a vendor responds', 'Weekly newsletter', 'New businesses near me'].map(label => (
                    <label key={label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer">
                      <span className="text-sm text-gray-700">{label}</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500" />
                    </label>
                  ))}
                </div>
                <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                  <h4 className="font-black text-red-800 mb-1">Delete Account</h4>
                  <p className="text-sm text-red-600 mb-3">This permanently deletes your account and all data.</p>
                  <button className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">Delete My Account</button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
