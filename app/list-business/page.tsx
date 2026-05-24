'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Upload, CheckCircle, ArrowRight,
  X, Image as ImageIcon, Plus, MapPin, Phone, Mail,
  Store, Utensils, Shirt, Building2, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BusinessCategory } from '@/types';

interface BusinessFormData {
  business_name: string;
  category: BusinessCategory;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  hours_of_operation?: string;
}

const STEPS = ['Business Info', 'Location', 'Contact', 'Images'];

const CATEGORIES = [
  {
    value: 'food_delivery',
    label: 'Food Delivery',
    icon: Utensils,
    desc: 'Restaurants, cafes, grocery & local food vendors',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50 border-orange-200',
    active: 'bg-orange-500 border-orange-500',
  },
  {
    value: 'fashion',
    label: 'Fashion & Fabric',
    icon: Shirt,
    desc: 'Clothing, accessories, African prints & fabric',
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50 border-rose-200',
    active: 'bg-rose-500 border-rose-500',
  },
  {
    value: 'real_estate',
    label: 'Real Estate',
    icon: Building2,
    desc: 'Property sales, rentals & real estate agents',
    color: 'from-amber-500 to-yellow-500',
    bg: 'bg-amber-50 border-amber-200',
    active: 'bg-amber-500 border-amber-500',
  },
];

export default function ListBusinessPage() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<BusinessFormData>();
  const selectedCategory = watch('category');

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryImages((prev) => [...prev, ...files]);
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  async function uploadImage(file: File, folder: 'covers' | 'gallery'): Promise<string> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Please upload a JPG, PNG, or WebP image.`);
    }

    // Validate file size (max 5 MB)
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} is too large. Maximum size is 5 MB.`);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    // Unique path: covers/1234567890-randomhex.jpg
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('business-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      // Surface a helpful message instead of the raw Supabase error
      if (uploadError.message.toLowerCase().includes('bucket not found')) {
        throw new Error(
          'Storage bucket "business-images" not found. ' +
          'Please create it in your Supabase dashboard under Storage, ' +
          'set it to Public, then try again.'
        );
      }
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-images')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  const onSubmit = async (data: BusinessFormData) => {
    setIsSubmitting(true);

    try {
      let coverUrl = '';
      const galleryUrls: string[] = [];

      // Only attempt uploads if files were selected
      if (coverImage) {
        coverUrl = await uploadImage(coverImage, 'covers');
      }
      for (const image of galleryImages) {
        const url = await uploadImage(image, 'gallery');
        galleryUrls.push(url);
      }

      const { error } = await supabase.from('businesses').insert([
        {
          ...data,
          cover_image_url: coverUrl || null,
          gallery_images: galleryUrls,
          is_active: true,
          rating: 0,
          total_reviews: 0,
        },
      ]);

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setSubmitError(msg);
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400';

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-200"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">You're all set! 🎉</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your business has been submitted for review. We'll notify you via email once it's live on AfriCart.
          </p>
          <div className="flex items-center justify-center gap-2 text-orange-500 text-sm font-semibold">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Redirecting to home...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-12">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-3">List Your Business</h1>
          <p className="text-orange-100 text-lg max-w-xl mx-auto">
            Join thousands of vendors on AfriCart and reach customers across Africa.
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="flex items-center py-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                    i === step ? 'text-orange-600' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i === step
                      ? 'bg-orange-500 text-white'
                      : i < step
                      ? 'bg-green-500 text-white'
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
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* Step 0: Business Info */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
              >
                <h2 className="text-xl font-black text-gray-900 mb-6">Business Information</h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Business Name *
                    </label>
                    <input
                      {...register('business_name', { required: 'Business name is required' })}
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Mama Ngozi's Kitchen"
                    />
                    {errors.business_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Category *
                    </label>
                    <div className="grid gap-3">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = selectedCategory === cat.value;
                        return (
                          <label
                            key={cat.value}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? `border-orange-400 bg-orange-50`
                                : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/50'
                            }`}
                          >
                            <input
                              {...register('category', { required: 'Category is required' })}
                              type="radio"
                              value={cat.value}
                              className="sr-only"
                            />
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm">{cat.label}</div>
                              <div className="text-xs text-gray-500">{cat.desc}</div>
                            </div>
                            {isSelected && (
                              <div className="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {errors.category && (
                      <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Description *
                    </label>
                    <textarea
                      {...register('description', { required: 'Description is required' })}
                      rows={4}
                      className={`${inputClass} resize-none`}
                      placeholder="Describe your business, what makes you unique, specialties..."
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200"
                  >
                    Next: Location <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 1: Location */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Location</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Street Address *
                    </label>
                    <input
                      {...register('address', { required: 'Address is required' })}
                      type="text"
                      className={inputClass}
                      placeholder="123 Adeola Odeku Street"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      City *
                    </label>
                    <input
                      {...register('city', { required: 'City is required' })}
                      type="text"
                      className={inputClass}
                      placeholder="Lagos"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Country *
                    </label>
                    <input
                      {...register('country', { required: 'Country is required' })}
                      type="text"
                      className={inputClass}
                      placeholder="Nigeria"
                    />
                    {errors.country && (
                      <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200"
                  >
                    Next: Contact <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Contact */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Contact Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Phone Number *
                    </label>
                    <input
                      {...register('phone', { required: 'Phone number is required' })}
                      type="tel"
                      className={inputClass}
                      placeholder="+234 800 000 0000"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Email Address *
                    </label>
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' },
                      })}
                      type="email"
                      className={inputClass}
                      placeholder="business@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Website (Optional)
                    </label>
                    <input
                      {...register('website')}
                      type="url"
                      className={inputClass}
                      placeholder="https://yourbusiness.com"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200"
                  >
                    Next: Images <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Images & Submit */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Business Images</h2>
                </div>

                {/* Cover Image */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Cover Image
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-orange-400 transition-colors">
                    {coverPreview ? (
                      <div className="relative">
                        <img src={coverPreview} alt="Cover preview" className="w-full h-48 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setCoverImage(null); setCoverPreview(null); }}
                          className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center py-10 px-6 text-center">
                        <input type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-orange-500" />
                        </div>
                        <p className="font-semibold text-gray-700 text-sm">Click to upload cover image</p>
                        <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400px, PNG or JPG</p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Gallery */}
                <div className="mb-8">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Gallery Images
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {galleryPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={preview}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {galleryPreviews.length < 10 && (
                      <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGalleryImagesChange}
                          className="hidden"
                        />
                        <Plus className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Add</span>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Upload up to 10 images</p>
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
                  <button
                    type="button"
                    onClick={() => { setStep(2); setSubmitError(''); }}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        List My Business <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-gray-400 mt-4">
                  By listing your business, you agree to our Terms of Service. Your business will be reviewed before going live.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
