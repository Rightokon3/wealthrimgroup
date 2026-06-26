'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Utensils, Shirt, Building2, MapPin, Phone, ChevronRight, CheckCircle, Upload, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StoreCategory } from '@/types';
import { Suspense } from 'react';

interface SetupForm {
  name: string; description: string; category: StoreCategory;
  address: string; city: string; state: string; phone: string; email: string; whatsapp: string;
}

const CATEGORIES = [
  { value: 'food',        label: 'Food & Delivery',   icon: Utensils,  color: 'from-orange-500 to-red-500',  desc: 'Restaurant, cafe, home cook, grocery' },
  { value: 'fashion',     label: 'Fashion & Fabric',  icon: Shirt,     color: 'from-rose-500 to-pink-600',   desc: 'Clothing, fabric, accessories, footwear' },
  { value: 'real_estate', label: 'Real Estate',       icon: Building2, color: 'from-amber-500 to-yellow-500',desc: 'Property sales, rentals, land listings' },
] as const;

const STEPS = ['Business Type', 'Store Details', 'Location & Contact'];
const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

function VendorSetupInner() {
  const router = useRouter();
  const { user, profile, isVendor, isLoggedIn, loading: authLoading } = useAuth();

  const [step,         setStep]         = useState(0);
  const [logo,         setLogo]         = useState<File|null>(null);
  const [cover,        setCover]        = useState<File|null>(null);
  const [logoPreview,  setLogoPreview]  = useState<string|null>(null);
  const [coverPreview, setCoverPreview] = useState<string|null>(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [done,         setDone]         = useState(false);

  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<SetupForm>();
  const selectedCategory = watch('category');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.replace('/auth/login?next=/vendor/setup'); return; }
    if (profile && !isVendor) { router.replace('/'); return; }
    // Already has a store? (maybeSingle returns null instead of throwing when 0 rows match)
    if (user) {
      supabase.from('stores').select('id').eq('vendor_id', user.id).maybeSingle().then(({ data }) => {
        if (data) router.replace('/vendor/dashboard');
      });
    }
  }, [authLoading, isLoggedIn, isVendor, profile, user, router]);

  async function upload(file: File, path: string): Promise<string|null> {
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const name = `${path}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('africart').upload(name, file, { upsert: true });
    if (error) return null;
    return supabase.storage.from('africart').getPublicUrl(name).data.publicUrl;
  }

  const onSubmit = async (data: SetupForm) => {
    if (!user) return;
    setSaving(true); setError('');
    try {
      // Hard guard: re-check immediately before inserting, in case the
      // earlier check missed a race (e.g. double-click on submit).
      const { data: existing } = await supabase.from('stores').select('id').eq('vendor_id', user.id).maybeSingle();
      if (existing) {
        router.replace('/vendor/dashboard');
        return;
      }

      const [logoUrl, coverUrl] = await Promise.all([
        logo  ? upload(logo,  `logos`)  : Promise.resolve(null),
        cover ? upload(cover, `covers`) : Promise.resolve(null),
      ]);

      const { error: storeErr } = await supabase.from('stores').insert([{
        vendor_id:   user.id,
        name:        data.name,
        description: data.description,
        category:    data.category,
        address:     data.address,
        city:        data.city,
        state:       data.state,
        phone:       data.phone,
        email:       data.email || null,
        whatsapp:    data.whatsapp || null,
        logo_url:    logoUrl,
        cover_url:   coverUrl,
        is_open:     true,
        is_active:   true,
      }]);

      if (storeErr) throw new Error(storeErr.message);
      setDone(true);
      setTimeout(() => router.push('/vendor/dashboard'), 2500);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-6">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-green-200">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Store Created! 🎉</h2>
        <p className="text-gray-500 mb-2">Your store is live. Now add your products.</p>
        <div className="flex items-center justify-center gap-2 text-orange-500 text-sm font-semibold mt-4">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Taking you to your dashboard...
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 py-10 text-white">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <h1 className="text-3xl font-black mb-1">Set Up Your Store</h1>
          <p className="text-orange-100">Hi {profile?.full_name?.split(' ')[0] ?? 'Vendor'}, let's get your store live in 3 steps.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[720px] mx-auto px-6 py-4 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 text-sm font-semibold ${i === step ? 'text-orange-600' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i === step ? 'bg-orange-500 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 rounded-full ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-4 py-10">
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">

            {/* STEP 0 — Category */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-xl font-black text-gray-900 mb-2">What do you sell?</h2>
                <p className="text-gray-500 text-sm mb-6">This determines how your store works — delivery flow, product fields and order process.</p>

                <div className="grid gap-4">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const active = selectedCategory === cat.value;
                    return (
                      <label key={cat.value}
                        className={`flex items-center gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all ${active ? 'border-orange-400 bg-orange-50 shadow-md shadow-orange-100' : 'border-gray-200 hover:border-orange-200'}`}>
                        <input {...register('category', { required: true })} type="radio" value={cat.value} className="sr-only" />
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-gray-900 text-base">{cat.label}</div>
                          <div className="text-sm text-gray-500 mt-0.5">{cat.desc}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${active ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                          {active && <span className="text-white text-xs font-black">✓</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-8">
                  <button type="button" onClick={() => selectedCategory && setStep(1)}
                    disabled={!selectedCategory}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 1 — Store Details */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">
                <h2 className="text-xl font-black text-gray-900">Store Details</h2>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Store Name *</label>
                  <input {...register('name', { required: 'Required' })} type="text" className={ic}
                    placeholder={selectedCategory === 'food' ? "e.g. Mama Ngozi's Kitchen" : selectedCategory === 'fashion' ? "e.g. Adunola Collections" : "e.g. Lagos Prime Properties"} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Description *</label>
                  <textarea {...register('description', { required: 'Required', minLength: { value: 20, message: 'At least 20 characters' } })}
                    rows={4} className={`${ic} resize-none`}
                    placeholder={selectedCategory === 'food' ? "Authentic Nigerian cuisine, jollof rice, egusi, delivery in 30 min..." : selectedCategory === 'fashion' ? "Premium ankara, aso-oke, ready-to-wear and custom designs..." : "Prime properties in Lagos and Abuja — buy, rent, lease..."} />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                </div>

                {/* Logo upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Store Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
                      {logoPreview ? <img src={logoPreview} alt="" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-gray-300" />}
                    </div>
                    <div>
                      <label className="cursor-pointer px-4 py-2 rounded-xl border border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50 transition-colors inline-block">
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setLogo(f); setLogoPreview(URL.createObjectURL(f)); }
                        }} />
                        Upload Logo
                      </label>
                      <p className="text-xs text-gray-400 mt-1">Square image · Max 2 MB</p>
                    </div>
                  </div>
                </div>

                {/* Cover upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Cover Photo</label>
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden hover:border-orange-300 transition-colors">
                    {coverPreview ? (
                      <div className="relative">
                        <img src={coverPreview} alt="" className="w-full h-36 object-cover" />
                        <button type="button" onClick={() => { setCover(null); setCoverPreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center py-8 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setCover(f); setCoverPreview(URL.createObjectURL(f)); }
                        }} />
                        <Upload className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">Upload cover photo</p>
                        <p className="text-xs text-gray-300 mt-0.5">1200×400px · PNG/JPG/WebP</p>
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(0)} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Location & Contact */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">
                <h2 className="text-xl font-black text-gray-900">Location & Contact</h2>

                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Address *</label>
                  <input {...register('address', { required: 'Required' })} type="text" className={ic} placeholder="14 Victoria Island, Lagos" />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                    <input {...register('city', { required: 'Required' })} type="text" className={ic} placeholder="Lagos" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">State</label>
                    <input {...register('state')} type="text" className={ic} placeholder="Lagos State" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone *</label>
                    <input {...register('phone', { required: 'Required' })} type="tel" className={ic} placeholder="+234 800 000 0000" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">WhatsApp</label>
                    <input {...register('whatsapp')} type="tel" className={ic} placeholder="+234 800 000 0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Business Email</label>
                  <input {...register('email')} type="email" className={ic} placeholder="store@mybusiness.com" />
                </div>

                {/* Commission notice */}
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <p className="text-amber-800 text-sm font-bold mb-1">💰 Platform Commission</p>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    AfriCart charges a <strong>10% platform fee</strong> on every sale. You receive <strong>90%</strong> of each order value. Payouts are processed within 24–48 hours of order completion to your registered bank account.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 disabled:opacity-60">
                    {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating store...</> : <>Launch My Store 🚀</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}

export default function VendorSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VendorSetupInner />
    </Suspense>
  );
}
