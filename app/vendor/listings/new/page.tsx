'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Upload, CheckCircle, ArrowRight, X, Image as ImageIcon,
  Plus, MapPin, Phone, Store, Utensils, Shirt, Building2,
  ChevronRight, AlertCircle, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type BusinessCategory = 'food_delivery' | 'fashion' | 'real_estate';

interface ListingFormData {
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
  {
    value: 'food_delivery',
    label: 'Food Delivery',
    icon:  Utensils,
    desc:  'Restaurants, cafes, grocery & local food vendors',
    color: 'from-orange-500 to-red-500',
    ring:  'border-orange-400 bg-orange-50',
  },
  {
    value: 'fashion',
    label: 'Fashion & Fabric',
    icon:  Shirt,
    desc:  'Clothing, accessories, African prints & fabric',
    color: 'from-rose-500 to-pink-500',
    ring:  'border-rose-400 bg-rose-50',
  },
  {
    value: 'real_estate',
    label: 'Real Estate',
    icon:  Building2,
    desc:  'Property sales, rentals & real estate agents',
    color: 'from-amber-500 to-yellow-500',
    ring:  'border-amber-400 bg-amber-50',
  },
] as const;

const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400';

export default function NewListingPage() {
  const router = useRouter();
  const { user, profile, isVendor, isLoggedIn, loading: authLoading } = useAuth();

  // ── state — ALL hooks before any conditional return ──────────────────────
  const [step,            setStep]            = useState(0);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [isSuccess,       setIsSuccess]       = useState(false);
  const [submitError,     setSubmitError]     = useState('');
  const [uploadProgress,  setUploadProgress]  = useState('');
  const [coverImage,      setCoverImage]      = useState<File | null>(null);
  const [coverPreview,    setCoverPreview]    = useState<string | null>(null);
  const [galleryImages,   setGalleryImages]   = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ListingFormData>();
  const selectedCategory = watch('category');

  // Auth guard — no middleware role check needed, handled here
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login?next=/vendor/listings/new');
    }
  }, [authLoading, isLoggedIn, router]);

  // ── image helpers ────────────────────────────────────────────────────────
  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setCoverImage(f); setCoverPreview(URL.createObjectURL(f)); }
  };

  const pickGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setGalleryImages(p => [...p, ...files]);
    setGalleryPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeGallery = (i: number) => {
    setGalleryImages(p => p.filter((_, idx) => idx !== i));
    setGalleryPreviews(p => p.filter((_, idx) => idx !== i));
  };

  // Upload a single file with a 30-second timeout
  // Returns the public URL, or null if the bucket isn't set up yet
  async function uploadFile(file: File, folder: 'covers' | 'gallery'): Promise<string | null> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error(`${file.name}: use JPG, PNG or WebP.`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} is over 5 MB. Please compress it first.`);
    }

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Race the upload against a 30-second timeout
    const uploadPromise = supabase.storage
      .from('business-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timed out after 30 s. Check your connection.')), 30_000)
    );

    const { error } = await Promise.race([uploadPromise, timeoutPromise]) as Awaited<typeof uploadPromise>;

    if (error) {
      const msg = error.message.toLowerCase();
      // Bucket missing — skip image upload silently so the listing still saves
      if (msg.includes('bucket') || msg.includes('not found')) return null;
      throw new Error(`Upload failed: ${error.message}`);
    }

    return supabase.storage.from('business-images').getPublicUrl(path).data.publicUrl;
  }

  const onSubmit = async (data: ListingFormData) => {
    if (!user) { router.push('/auth/login?next=/vendor/listings/new'); return; }

    setIsSubmitting(true);
    setSubmitError('');
    setUploadProgress('Starting...');

    try {
      let coverUrl: string | null = null;
      const galleryUrls: string[] = [];

      // Upload cover image
      if (coverImage) {
        setUploadProgress('Uploading cover image...');
        coverUrl = await uploadFile(coverImage, 'covers');
      }

      // Upload gallery images one by one with progress
      for (let i = 0; i < galleryImages.length; i++) {
        setUploadProgress(`Uploading photo ${i + 1} of ${galleryImages.length}...`);
        const url = await uploadFile(galleryImages[i], 'gallery');
        if (url) galleryUrls.push(url);
      }

      setUploadProgress('Saving your listing...');

      const { error } = await supabase.from('businesses').insert([{
        ...data,
        user_id:         user.id,
        cover_image_url: coverUrl ?? null,
        gallery_images:  galleryUrls,
        is_active:       true,
        is_verified:     false,
        rating:          0,
        total_reviews:   0,
      }]);

      if (error) throw new Error(error.message);

      setUploadProgress('');
      setIsSuccess(true);
      setTimeout(() => router.push('/vendor/dashboard'), 3000);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
      setUploadProgress('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── guards (after all hooks) ─────────────────────────────────────────────

  if (authLoading || (isLoggedIn && profile === null)) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading your account...</p>
        </div>
      </div>
    );
  }

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

  if (profile !== null && !isVendor) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg border border-orange-100">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Vendor Account Required</h2>
          <p className="text-gray-500 text-sm mb-5">
            You're signed in as a customer. Create a vendor account to list your business.
          </p>
          <button onClick={() => router.push('/auth/signup?role=vendor')}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700">
            Create Vendor Account
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md mx-auto px-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-200">
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Listing Created! 🎉</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your business has been listed successfully. We'll review and verify it shortly.
          </p>
          <div className="flex items-center justify-center gap-2 text-orange-500 text-sm font-semibold">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Redirecting to your dashboard...
          </div>
        </motion.div>
      </div>
    );
  }

  // ── main form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-10">
        <div className="max-w-[860px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">New Listing</h1>
              <p className="text-orange-100 text-sm">
                Hi {profile?.full_name?.split(' ')[0] ?? 'Vendor'} — fill out the steps below to go live.
              </p>
            </div>
          </div>
          <Link href="/vendor/dashboard"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-sm transition-all">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[860px] mx-auto px-6">
          <div className="flex items-center py-4 gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                    i === step ? 'text-orange-600' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400 cursor-default'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${
                    i === step ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                    : i < step  ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:block">{s}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[860px] mx-auto px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">

            {/* ── STEP 0: Business Info ─────────────────────────── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-black text-gray-900 mb-6">Business Information</h2>

                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Business Name *</label>
                    <input {...register('business_name', { required: 'Business name is required' })}
                      type="text" className={ic} placeholder="e.g. Mama Ngozi's Kitchen" />
                    {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Category *</label>
                    <div className="grid gap-3">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const active = selectedCategory === cat.value;
                        return (
                          <label key={cat.value}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${active ? cat.ring : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/40'}`}>
                            <input {...register('category', { required: 'Please pick a category' })}
                              type="radio" value={cat.value} className="sr-only" />
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-gray-900 text-sm">{cat.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{cat.desc}</div>
                            </div>
                            {active && (
                              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-black">✓</span>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Description *</label>
                    <textarea {...register('description', { required: 'Description is required', minLength: { value: 30, message: 'At least 30 characters please' } })}
                      rows={4} className={`${ic} resize-none`}
                      placeholder="What makes your business special? Describe your products, specialties, and what customers can expect..." />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200">
                    Next: Location <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: Location ──────────────────────────────── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Location</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Street Address *</label>
                    <input {...register('address', { required: 'Address is required' })}
                      type="text" className={ic} placeholder="14 Victoria Island, Lagos" />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                    <input {...register('city', { required: 'City is required' })}
                      type="text" className={ic} placeholder="Lagos" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Country *</label>
                    <input {...register('country', { required: 'Country is required' })}
                      type="text" className={ic} placeholder="Nigeria" />
                    {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button type="button" onClick={() => setStep(0)}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
                    ← Back
                  </button>
                  <button type="button" onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                    Next: Contact <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Contact ───────────────────────────────── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Contact Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                    <input {...register('phone', { required: 'Phone is required' })}
                      type="tel" className={ic} placeholder="+234 800 000 0000" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Business Email *</label>
                    <input {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/i, message: 'Enter a valid email' } })}
                      type="email" className={ic} placeholder="hello@mybusiness.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Website <span className="normal-case text-gray-400 font-normal">(optional)</span></label>
                    <input {...register('website')}
                      type="url" className={ic} placeholder="https://mybusiness.com" />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="button" onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                    Next: Images <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Images + Submit ───────────────────────── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Business Images</h2>
                </div>

                {/* Cover image */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Cover Image <span className="normal-case text-gray-400 font-normal">(recommended)</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-orange-300 transition-colors">
                    {coverPreview ? (
                      <div className="relative">
                        <img src={coverPreview} alt="Cover" className="w-full h-52 object-cover" />
                        <button type="button" onClick={() => { setCoverImage(null); setCoverPreview(null); }}
                          className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center py-12 px-6 text-center">
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickCover} className="hidden" />
                        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                          <Upload className="w-7 h-7 text-orange-500" />
                        </div>
                        <p className="font-semibold text-gray-700 text-sm">Click to upload cover photo</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG or WebP · Max 5 MB · Ideal: 1200 × 400 px</p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Gallery */}
                <div className="mb-8">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Gallery <span className="normal-case text-gray-400 font-normal">(up to 10 photos)</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {galleryPreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeGallery(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {galleryPreviews.length < 10 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickGallery} className="hidden" />
                        <Plus className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Add</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Error banner */}
                {submitError && (
                  <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 font-bold text-sm">Submission failed</p>
                      <p className="text-red-600 text-sm mt-0.5">{submitError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => { setStep(2); setSubmitError(''); }}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {uploadProgress || 'Publishing...'}</>
                      : <>Publish Listing <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </div>

                <p className="text-xs text-center text-gray-400 mt-4">
                  By publishing you agree to our{' '}
                  <Link href="/terms" className="text-orange-500 hover:underline">Terms of Service</Link>.
                  Images are optional — your listing will go live even without them.
                </p>

                {/* Upload progress bar */}
                {isSubmitting && uploadProgress && (
                  <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="flex items-center gap-2 text-sm text-orange-700 font-medium">
                      <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      {uploadProgress}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
