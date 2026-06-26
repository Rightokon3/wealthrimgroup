'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, ShoppingCart, Settings, Camera, CheckCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'profile'|'orders'|'reviews'|'settings';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, isLoggedIn, loading:al, updateProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ full_name:'', phone:'', city:'', country:'' });

  useEffect(() => { if (!al && !isLoggedIn) router.replace('/auth/login?next=/account'); }, [al, isLoggedIn, router]);
  useEffect(() => { if (profile) setForm({ full_name:profile.full_name??'', phone:profile.phone??'', city:profile.city??'', country:profile.country??'' }); }, [profile]);
  useEffect(() => { if (user) fetchData(); }, [user]);

  async function fetchData() {
    const [o, r] = await Promise.all([
      supabase.from('orders').select('*, stores(name,logo_url)').eq('customer_id', user!.id).order('created_at',{ascending:false}).limit(5),
      supabase.from('reviews').select('*, stores(name,logo_url)').eq('customer_id', user!.id).order('created_at',{ascending:false}),
    ]);
    setOrders(o.data??[]); setReviews(r.data??[]);
  }

  const handleSave = async () => {
    setSaving(true); await updateProfile(form); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  if (al) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';
  const TABS: { id:Tab; label:string; icon:React.ReactNode }[] = [
    { id:'profile', label:'My Profile', icon:<User className="w-4 h-4"/> },
    { id:'orders',  label:'Orders',     icon:<ShoppingCart className="w-4 h-4"/> },
    { id:'reviews', label:'My Reviews', icon:<Star className="w-4 h-4"/> },
    { id:'settings',label:'Settings',   icon:<Settings className="w-4 h-4"/> },
  ];

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="max-w-[900px] mx-auto px-6 py-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-black">
                {profile?.full_name?.charAt(0).toUpperCase()??'?'}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg"><Camera className="w-3.5 h-3.5 text-orange-500"/></button>
            </div>
            <div>
              <h1 className="text-2xl font-black">{profile?.full_name??'Customer'}</h1>
              <p className="text-orange-100 text-sm">{user?.email}</p>
              <span className="inline-flex mt-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">🛒 Customer</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold border-b border-gray-50 last:border-0 transition-all ${tab===t.id?'bg-orange-50 text-orange-600':'text-gray-600 hover:bg-gray-50'}`}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            {tab==='profile' && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-black text-gray-900 mb-5">Edit Profile</h2>
                <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Full Name</label><input type="text" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} className={ic}/></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Email</label><input type="email" value={user?.email??''} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-100 text-gray-400 cursor-not-allowed"/></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone</label><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={ic}/></div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City</label><input type="text" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className={ic}/></div>
                  </div>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 disabled:opacity-60">
                    {saving?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</>:saved?<><CheckCircle className="w-4 h-4"/>Saved!</>:'Save Changes'}
                  </button>
                </div>
              </motion.div>
            )}

            {tab==='orders' && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-3">
                {orders.length===0?(
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                    <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                    <h3 className="font-black text-gray-700 mb-1">No orders yet</h3>
                    <Link href="/" className="inline-flex mt-3 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm">Browse Stores</Link>
                  </div>
                ):orders.map(o=>(
                  <Link key={o.id} href="/orders" className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-orange-200 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {o.stores?.logo_url&&<img src={o.stores.logo_url} className="w-10 h-10 rounded-xl object-cover" alt=""/>}
                        <div><p className="font-bold text-gray-900 text-sm">{o.stores?.name}</p><p className="text-xs text-gray-400 capitalize">{o.status.replace(/_/g,' ')}</p></div>
                      </div>
                      <p className="font-black text-gray-900">₦{o.total.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
                <Link href="/orders" className="block text-center text-sm text-orange-500 font-bold pt-2">View all orders →</Link>
              </motion.div>
            )}

            {tab==='reviews' && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-3">
                {reviews.length===0?(
                  <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                    <Star className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                    <h3 className="font-black text-gray-700 mb-1">No reviews yet</h3>
                  </div>
                ):reviews.map(r=>(
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-gray-900 text-sm">{r.stores?.name}</p>
                      <div className="flex gap-0.5">{[1,2,3,4,5].map(s=><Star key={s} className={`w-3.5 h-3.5 ${s<=r.rating?'fill-amber-400 text-amber-400':'text-gray-200'}`}/>)}</div>
                    </div>
                    <p className="text-sm text-gray-600">{r.comment}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {tab==='settings' && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <input type="password" placeholder="New password" className={ic}/>
                  <input type="password" placeholder="Confirm new password" className={ic}/>
                  <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">Update Password</button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
