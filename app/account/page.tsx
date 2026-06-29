'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User, ShoppingCart, Settings, Camera, CheckCircle, Star, MapPin, Plus, Trash2, Home, Briefcase } from 'lucide-react';
import { SavedAddress } from '@/types';

type Tab = 'profile' | 'orders' | 'reviews' | 'addresses' | 'settings';

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, isLoggedIn, loading:al, updateProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ full_name:'', phone:'', city:'', country:'' });
  const [addresses,    setAddresses]    = useState<SavedAddress[]>([]);
const [addingAddr,   setAddingAddr]   = useState(false);
const [savingAddr,   setSavingAddr]   = useState(false);
const [addrForm,     setAddrForm]     = useState({ label: 'Home', address: '', city: '', state: '' });
const [addrError,    setAddrError]    = useState('');

  useEffect(() => { if (!al && !isLoggedIn) router.replace('/auth/login?next=/account'); }, [al, isLoggedIn, router]);
  useEffect(() => { if (profile) setForm({ full_name:profile.full_name??'', phone:profile.phone??'', city:profile.city??'', country:profile.country??'' }); }, [profile]);
  useEffect(() => { if (user) fetchData(); }, [user]);

async function fetchData() {
  const [o, r, a] = await Promise.all([
    supabase.from('orders').select('*, stores(name,logo_url)').eq('customer_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('*, stores(name,logo_url)').eq('customer_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('saved_addresses').select('*').eq('customer_id', user!.id).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  setOrders(o.data ?? []);
  setReviews(r.data ?? []);
  setAddresses(a.data ?? []);
}

  const handleSave = async () => {
    setSaving(true); await updateProfile(form); setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  async function saveAddress() {
  if (!addrForm.address.trim()) { setAddrError('Enter an address.'); return; }
  if (!addrForm.city.trim())    { setAddrError('Enter a city.'); return; }
  setSavingAddr(true); setAddrError('');

  const isFirst = addresses.length === 0;
  const { data, error } = await supabase.from('saved_addresses').insert({
    customer_id: user!.id,
    label:       addrForm.label,
    address:     addrForm.address,
    city:        addrForm.city,
    state:       addrForm.state || null,
    is_default:  isFirst, // first address becomes default automatically
  }).select().single();

  if (error) { setAddrError(error.message); setSavingAddr(false); return; }
  setAddresses(prev => isFirst ? [{ ...data, is_default: true }] : [data, ...prev]);
  setAddrForm({ label: 'Home', address: '', city: '', state: '' });
  setAddingAddr(false);
  setSavingAddr(false);
}

async function deleteAddress(id: string) {
  await supabase.from('saved_addresses').delete().eq('id', id);
  setAddresses(prev => prev.filter(a => a.id !== id));
}

async function setDefault(id: string) {
  // Remove default from all, then set on chosen
  await supabase.from('saved_addresses').update({ is_default: false }).eq('customer_id', user!.id);
  await supabase.from('saved_addresses').update({ is_default: true }).eq('id', id);
  setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
}

  if (al) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',   label: 'My Profile',  icon: <User className="w-4 h-4" /> },
  { id: 'orders',    label: 'Orders',       icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'addresses', label: 'Addresses',    icon: <MapPin className="w-4 h-4" /> },
  { id: 'reviews',   label: 'My Reviews',   icon: <Star className="w-4 h-4" /> },
  { id: 'settings',  label: 'Settings',     icon: <Settings className="w-4 h-4" /> },
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
            {tab === 'addresses' && (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
    {/* Saved address cards */}
    {addresses.map(addr => (
      <div key={addr.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${addr.is_default ? 'border-orange-300 bg-orange-50/40' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${addr.is_default ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
              {addr.label === 'Work' ? <Briefcase className="w-4 h-4" /> : <Home className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{addr.label}</span>
                {addr.is_default && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">Default</span>}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{addr.address}</p>
              <p className="text-xs text-gray-400">{addr.city}{addr.state ? `, ${addr.state}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!addr.is_default && (
              <button onClick={() => setDefault(addr.id)}
                className="text-xs text-orange-500 font-bold hover:underline whitespace-nowrap">
                Set default
              </button>
            )}
            <button onClick={() => deleteAddress(addr.id)}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    ))}

    {/* Add new address form */}
    {addingAddr ? (
      <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5 space-y-4">
        <h3 className="font-black text-gray-900 text-sm">New Address</h3>

        {addrError && (
          <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
            {addrError}
          </div>
        )}

        {/* Label selector */}
        <div className="flex gap-2">
          {['Home', 'Work', 'Other'].map(l => (
            <button key={l} onClick={() => setAddrForm(f => ({ ...f, label: l }))}
              className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${addrForm.label === l ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {l === 'Home' ? '🏠' : l === 'Work' ? '💼' : '📍'} {l}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Street Address *</label>
          <input type="text" value={addrForm.address}
            onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))}
            placeholder="e.g. 14 Admiralty Way, Lekki"
            className={ic} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">City *</label>
            <input type="text" value={addrForm.city}
              onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Lagos" className={ic} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">State</label>
            <input type="text" value={addrForm.state}
              onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))}
              placeholder="Lagos State" className={ic} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setAddingAddr(false); setAddrError(''); }}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:border-gray-300 transition-all">
            Cancel
          </button>
          <button onClick={saveAddress} disabled={savingAddr}
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {savingAddr ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Address'}
          </button>
        </div>
      </div>
    ) : (
      <button onClick={() => setAddingAddr(true)}
        className="w-full py-3.5 border-2 border-dashed border-orange-200 rounded-2xl text-orange-500 font-bold text-sm flex items-center justify-center gap-2 hover:border-orange-400 hover:bg-orange-50 transition-all">
        <Plus className="w-4 h-4" /> Add New Address
      </button>
    )}
  </motion.div>
)}
          </div>
        </div>
      </div>
    </div>
  );
}
