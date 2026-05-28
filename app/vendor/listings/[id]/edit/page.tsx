'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, MapPin, Phone, CheckCircle, AlertCircle, Loader, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Suspense } from 'react';

interface EditFormData {
  business_name: string;
  description:   string;
  address:       string;
  city:          string;
  country:       string;
  phone:         string;
  email:         string;
  website?:      string;
  is_active:     boolean;
}

const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white';

function EditListingInner() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, isVendor, isLoggedIn, loading: authLoading } = useAuth();

  const [fetchLoading, setFetchLoading] = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');
  const [notFound,     setNotFound]     = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditFormData>();

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.replace(`/auth/login?next=/vendor/listings/${id}/edit`); return; }
    if (id) fetchListing();
  }, [authLoading, isLoggedIn, id]);

  async function fetchListing() {
    setFetchLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)   // only the owner can edit
      .single();

    if (error || !data) { setNotFound(true); setFetchLoading(false); return; }

    reset({
      business_name: data.business_name,
      description:   data.description,
      address:       data.address,
      city:          data.city,
      country:       data.country,
      phone:         data.phone,
      email:         data.email,
      website:       data.website ?? '',
      is_active:     data.is_active,
    });
    setFetchLoading(false);
  }

  const onSubmit = async (data: EditFormData) => {
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('businesses')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setTimeout(() => { setSaved(false); router.push('/vendor/dashboard'); }, 2000);
    setSaving(false);
  };

  if (authLoading || fetchLoading) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading listing...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow border border-gray-100">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Listing not found</h2>
        <p className="text-gray-500 text-sm mb-5">This listing doesn't exist or doesn't belong to your account.</p>
        <Link href="/vendor/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600">← Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-8">
        <div className="max-w-[800px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">Edit Listing</h1>
              <p className="text-orange-100 text-sm">Update your business information</p>
            </div>
          </div>
          <Link href="/vendor/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-sm">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-10">
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 font-semibold text-sm">Changes saved! Redirecting to dashboard...</p>
          </motion.div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-500" /> Business Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Business Name *</label>
                <input {...register('business_name', { required: 'Required' })} type="text" className={ic} />
                {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Description *</label>
                <textarea {...register('description', { required: 'Required' })} rows={5} className={`${ic} resize-none`} />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 accent-orange-500" />
                <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Listing is active (visible to customers)
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" /> Location
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Street Address *</label>
                <input {...register('address', { required: 'Required' })} type="text" className={ic} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                <input {...register('city', { required: 'Required' })} type="text" className={ic} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Country *</label>
                <input {...register('country', { required: 'Required' })} type="text" className={ic} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-500" /> Contact
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone *</label>
                <input {...register('phone', { required: 'Required' })} type="tel" className={ic} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Email *</label>
                <input {...register('email', { required: 'Required' })} type="email" className={ic} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Website (optional)</label>
                <input {...register('website')} type="url" className={ic} placeholder="https://" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link href="/vendor/dashboard"
              className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
              Cancel
            </Link>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 disabled:opacity-60">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : 'Save Changes'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[64px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EditListingInner />
    </Suspense>
  );
}
