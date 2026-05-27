'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Upload, CheckCircle, ArrowRight, X, Image as ImageIcon,
  Plus, MapPin, Phone, Store, Utensils, Shirt, Building2,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type BusinessCategory = 'food_delivery' | 'fashion' | 'real_estate';

interface BusinessFormData {
  business_name: string;
  category:      BusinessCategory;
  description:   string;
  address:       string;
  city:          string;
  country:       string;
  phone:         string;
  email:         string;
  website?:      string;
}

const STEPS = ['Business Info', 'Location', 'Contact', 'Images'];

const CATEGORIES = [
  { value: 'food_delivery', label: 'Food Delivery',    icon: Utensils,  desc: 'Restaurants, cafes, grocery & local food vendors', color: 'from-orange-500 to-red-500' },
  { value: 'fashion',       label: 'Fashion & Fabric', icon: Shirt,     desc: 'Clothing, accessories, African prints & fabric',   color: 'from-rose-500 to-pink-500' },
  { value: 'real_estate',   label: 'Real Estate',      icon: Building2, desc: 'Property sales, rentals & real estate agents',     color: 'from-amber-500 to-yellow-500' },
] as const;

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400';

export default function ListBusinessPage() {
  const router = useRouter();

  // ── ALL hooks must be called unconditionally at the top ──────────────────
  const { user, profile, isVendor, isLoggedIn, loading: authLoading } = useAuth();

  const [step,           setStep]           = useState(0);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [isSuccess,      setIsSuccess]      = useState(false);
  const [submitError,    setSubmitError]    = useState('');
  const [coverImage,     setCoverImage]     = useState<File | null>(null);
  const [galleryImages,  setGalleryImages]  = useState<File[]>([]);
  const [coverPreview,   setCoverPreview]   = useState<string | null>(null);
  const [galleryPreviews,setGalleryPreviews]= useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<BusinessFormData>();
  const selectedCategory = watch('category');

  // ── Redirect non-vendors (client-side only, no middleware) ───────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/list-business');
    }
    // Note: we do NOT redirect if profile is null yet — it may still be loading
  }, [authLoading, isLoggedIn, router]);

  // ── Image handlers ───────────────────────────────────────────────────────
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverImage(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryImages(prev => [...prev, ...files]);
    setGalleryPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  async function uploadImage(file: File, folder: 'covers' | 'gallery'): Promise<string> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) throw new Error(`Invalid file type. Please upload JPG, PNG, or WebP.`);
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} exceeds 5 MB limit.`);

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('business-images')
      .upload(`${folder}/${fileName}`, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('bucket not found'))
        throw new Error('Storage bucket "business-images" not found. Create it in Supabase → Storage and set it to Public.');
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from('business-images').getPublicUrl(`${folder}/${fileName}`);
    return publicUrl;
  }

  const onSubmit = async (data: BusinessFormData) => {
    if (!user) { router.push('/auth/login?next=/list-business'); return; }
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let coverUrl = '';
      const galleryUrls: string[] = [];
      if (coverImage)        coverUrl = await uploadImage(coverImage, 'covers');
      for (const img of galleryImages) galleryUrls.push(await uploadImage(img, 'gallery'));

      const { error } = await supabase.from('businesses').insert([{
        ...data,
        user_id:         user.id,
        cover_image_url: coverUrl || null,
        gallery_images:  galleryUrls,
        is_active:       true,
        rating:          0,
        total_reviews:   0,
      }]);

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => router.push('/vendor/dashboard'), 3000);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render guards (after all hooks) ─────────────────────────────────────

  // Still loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in at all
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Logged in but not a vendor (only show this if profile has loaded)
  if (profile !== null && !isVendor) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg border border-orange-100 mx-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Vendor Account Required</h2>
          <p className="text-gray-500 text-sm mb-5">
            You're signed in as a customer. To list a business you need a vendor account.
          </p>
          <button
            onClick={() => router.push('/auth/signup?role=vendor')}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700"
          >
            Create Vendor Account
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md mx-auto px-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-200">
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">You're all set! 🎉</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">Your business has been listed. Taking you to your dashboard...</p>
          <div className="flex items-center justify-center gap-2 text-orange-500 text-sm font-semibold">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Redirecting to dashboard...
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-12">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2">List Your Business</h1>
          <p className="text-orange-100 text-lg max-w-xl mx-auto">
            Welcome, {profile?.full_name ?? 'Vendor'}! Fill out the form below to go live.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="flex items-center py-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors ${i === step ? 'text-orange-600' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i === step ? 'bg-orange-500 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block">{s}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 rounded-full ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">

            {/* Step 0 — Business Info */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-black text-gray-900 mb-6">Business Information</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Business Name *</label>
                    <input {...register('business_name', { required: 'Business name is required' })} type="text" className={inputClass} placeholder="e.g. Mama Ngozi's Kitchen" />
                    {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Category *</label>
                    <div className="grid gap-3">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isSelected = selectedCategory === cat.value;
                        return (
                          <label key={cat.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
                            <input {...register('category', { required: 'Category is required' })} type="radio" value={cat.value} className="sr-only" />
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}><Icon className="w-5 h-5 text-white" /></div>
                            <div><div className="font-bold text-gray-900 text-sm">{cat.label}</div><div className="text-xs text-gray-500">{cat.desc}</div></div>
                            {isSelected && <div className="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                          </label>
                        );
                      })}
                    </div>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Description *</label>
                    <textarea {...register('description', { required: 'Description is required' })} rows={4} className={`${inputClass} resize-none`} placeholder="Describe your business, specialties, what makes you unique..." />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                  </div>
                </div>
                <div className="flex justify-end mt-8">
                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200">
                    Next: Location <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 1 — Location */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><MapPin className="w-5 h-5 text-orange-500" /></div>
                  <h2 className="text-xl font-black text-gray-900">Location</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Street Address *</label>
                    <input {...register('address', { required: 'Address is required' })} type="text" className={inputClass} placeholder="123 Adeola Odeku Street" />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                    <input {...register('city', { required: 'City is required' })} type="text" className={inputClass} placeholder="Lagos" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Country *</label>
                    <input {...register('country', { required: 'Country is required' })} type="text" className={inputClass} placeholder="Nigeria" />
                    {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
                  </div>
                </div>
                <div className="flex justify-between mt-8">
                  <button type="button" onClick={() => setStep(0)} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                    Next: Contact <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Contact */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><Phone className="w-5 h-5 text-orange-500" /></div>
                  <h2 className="text-xl font-black text-gray-900">Contact Information</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                    <input {...register('phone', { required: 'Phone is required' })} type="tel" className={inputClass} placeholder="+234 800 000 0000" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Business Email *</label>
                    <input {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} type="email" className={inputClass} placeholder="business@example.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Website (Optional)</label>
                    <input {...register('website')} type="url" className={inputClass} placeholder="https://yourbusiness.com" />
                  </div>
                </div>
                <div className="flex justify-between mt-8">
                  <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button type="button" onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                    Next: Images <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Images & Submit */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-orange-500" /></div>
                  <h2 className="text-xl font-black text-gray-900">Business Images</h2>
                </div>

                {/* Cover image */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Cover Image</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-orange-400 transition-colors">
                    {coverPreview ? (
                      <div className="relative">
                        <img src={coverPreview} alt="Cover" className="w-full h-48 object-cover" />
                        <button type="button" onClick={() => { setCoverImage(null); setCoverPreview(null); }} className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center py-10 px-6 text-center">
                        <input type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-3"><Upload className="w-6 h-6 text-orange-500" /></div>
                        <p className="font-semibold text-gray-700 text-sm">Click to upload cover image</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG or WebP · Max 5 MB</p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Gallery */}
                <div className="mb-8">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Gallery Images</label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {galleryPreviews.map((preview, i) => (
                      <div key={i} className="relative aspect-square">
                        <img src={preview} alt="" className="w-full h-full object-cover rounded-xl" />
                        <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {galleryPreviews.length < 10 && (
                      <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                        <input type="file" accept="image/*" multiple onChange={handleGalleryImagesChange} className="hidden" />
                        <Plus className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Add</span>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Up to 10 images</p>
                </div>

                {submitError && (
                  <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                    <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
                    <div>
                      <p className="text-red-700 font-bold text-sm mb-0.5">Submission failed</p>
                      <p className="text-red-600 text-sm">{submitError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={() => { setStep(2); setSubmitError(''); }} className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</> : <>List My Business <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
                <p className="text-xs text-center text-gray-400 mt-4">By listing your business you agree to our Terms of Service.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
