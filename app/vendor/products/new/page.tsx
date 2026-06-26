'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { X, Upload, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Store, ProductCategory, StoreCategory } from '@/types';
import { Suspense } from 'react';

interface ProductForm {
  name: string; description: string; price: number;
  category_id: string; is_available: boolean; is_featured: boolean;
  // Real estate
  property_type: string; bedrooms: number; bathrooms: number; area_sqm: number;
  // Fashion
  sizes: string; colors: string;
  // Food — nothing extra
}

const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

function ProductFormInner() {
  const router      = useRouter();
  const searchParams= useSearchParams();
  const editId      = searchParams.get('id') || undefined;
  const isEdit      = !!editId;
  const { user, loading: authLoading } = useAuth();

  const [store,      setStore]      = useState<Store|null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [image,      setImage]      = useState<File|null>(null);
  const [imagePreview, setImagePreview] = useState<string|null>(null);
  const [gallery,    setGallery]    = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');
  const [newCat,     setNewCat]     = useState('');
  const [addingCat,  setAddingCat]  = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProductForm>({ defaultValues: { is_available: true, is_featured: false } });
  const price = watch('price') || 0;
  const platformFee = +(price * 0.10).toFixed(2);
  const vendorGets  = +(price * 0.90).toFixed(2);

  useEffect(() => {
    if (!authLoading && user) loadStore();
  }, [authLoading, user]);

  async function loadStore() {
    const { data: storeData } = await supabase.from('stores').select('*').eq('vendor_id', user!.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!storeData) { router.replace('/vendor/setup'); return; }
    setStore(storeData);

    const { data: cats } = await supabase.from('product_categories').select('*').eq('store_id', storeData.id).order('sort_order');
    setCategories(cats ?? []);

    if (isEdit) {
      const { data: prod } = await supabase.from('products').select('*').eq('id', editId).single();
      if (prod) {
        reset({
          name:          prod.name,
          description:   prod.description ?? '',
          price:         prod.price,
          category_id:   prod.category_id ?? '',
          is_available:  prod.is_available,
          is_featured:   prod.is_featured,
          property_type: prod.property_type ?? '',
          bedrooms:      prod.bedrooms ?? 0,
          bathrooms:     prod.bathrooms ?? 0,
          area_sqm:      prod.area_sqm ?? 0,
          sizes:         (prod.sizes ?? []).join(', '),
          colors:        (prod.colors ?? []).join(', '),
        });
        if (prod.image_url) setImagePreview(prod.image_url);
        if (prod.images?.length) setGalleryPreviews(prod.images);
      }
    }
  }

  async function addCategory() {
    if (!newCat.trim() || !store) return;
    setAddingCat(true);
    const { data } = await supabase.from('product_categories')
      .insert([{ store_id: store.id, name: newCat.trim(), sort_order: categories.length }])
      .select().single();
    if (data) { setCategories(p => [...p, data]); setNewCat(''); }
    setAddingCat(false);
  }

  async function uploadFile(file: File, folder: string): Promise<string|null> {
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `${folder}/${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('africart').upload(path, file, { upsert: true });
    if (error) return null;
    return supabase.storage.from('africart').getPublicUrl(path).data.publicUrl;
  }

  const onSubmit = async (data: ProductForm) => {
    if (!store) return;
    setSaving(true); setError('');

    try {
      const imageUrl   = image ? await uploadFile(image, 'products') : imagePreview;
      const galleryUrls= gallery.length > 0
        ? (await Promise.all(gallery.map(f => uploadFile(f, 'gallery')))).filter(Boolean) as string[]
        : galleryPreviews.filter(u => !u.startsWith('blob:'));

      const payload = {
        store_id:      store.id,
        name:          data.name,
        description:   data.description || null,
        price:         +data.price,
        category_id:   data.category_id || null,
        is_available:  data.is_available,
        is_featured:   data.is_featured,
        image_url:     imageUrl,
        images:        galleryUrls,
        // Real estate fields
        property_type: store.category === 'real_estate' ? data.property_type || null : null,
        bedrooms:      store.category === 'real_estate' ? +data.bedrooms || null : null,
        bathrooms:     store.category === 'real_estate' ? +data.bathrooms || null : null,
        area_sqm:      store.category === 'real_estate' ? +data.area_sqm || null : null,
        // Fashion fields
        sizes:         store.category === 'fashion' ? data.sizes?.split(',').map(s=>s.trim()).filter(Boolean) : [],
        colors:        store.category === 'fashion' ? data.colors?.split(',').map(c=>c.trim()).filter(Boolean) : [],
      };

      if (isEdit) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editId).eq('store_id', store.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('products').insert([payload]);
        if (err) throw err;
      }

      setSaved(true);
      setTimeout(() => router.push('/vendor/dashboard'), 1800);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const catLabel = (cat: StoreCategory) => cat === 'food' ? 'Food Item' : cat === 'fashion' ? 'Product' : 'Property';

  if (authLoading || !store) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (saved) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-green-50">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-6">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-200">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">{isEdit ? 'Updated!' : 'Product Added!'}</h2>
        <p className="text-gray-500 text-sm">Redirecting to your products...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[760px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-black text-gray-900 text-lg">{isEdit ? 'Edit' : 'Add'} {catLabel(store.category)}</h1>
            <p className="text-xs text-gray-400">{store.name}</p>
          </div>
          <button onClick={() => router.push('/vendor/dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900">
              {store.category === 'food' ? '🍛 Food Item Details' : store.category === 'fashion' ? '👗 Product Details' : '🏠 Property Details'}
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                {store.category === 'food' ? 'Item Name' : store.category === 'fashion' ? 'Product Name' : 'Property Title'} *
              </label>
              <input {...register('name', { required: 'Required' })} type="text" className={ic}
                placeholder={store.category === 'food' ? 'e.g. Jollof Rice & Chicken' : store.category === 'fashion' ? 'e.g. Ankara Wrap Dress' : 'e.g. 3 Bedroom Flat, Lekki Phase 1'} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea {...register('description')} rows={3} className={`${ic} resize-none`}
                placeholder={store.category === 'food' ? 'Ingredients, portion size, spice level...' : store.category === 'fashion' ? 'Material, style, care instructions...' : 'Features, amenities, location highlights...'} />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                {store.category === 'food' ? 'Menu Section' : 'Category'}
              </label>
              <div className="flex gap-2">
                <select {...register('category_id')} className={`${ic} flex-1`}>
                  <option value="">— No category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-2">
                  {!addingCat
                    ? <button type="button" onClick={() => setAddingCat(true)} className="px-3 py-2 rounded-xl border border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50"><Plus className="w-4 h-4" /></button>
                    : (
                      <div className="flex gap-1">
                        <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category" className="px-3 py-2 rounded-xl border border-gray-200 text-sm w-36 outline-none focus:border-orange-400" />
                        <button type="button" onClick={addCategory} className="px-3 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold">Add</button>
                        <button type="button" onClick={() => { setAddingCat(false); setNewCat(''); }} className="px-2 py-2 rounded-xl border border-gray-200 text-gray-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-black text-gray-900 mb-4">Pricing</h2>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                {store.category === 'real_estate' ? 'Price / Rent Amount (₦)' : 'Price (₦)'} *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₦</span>
                <input {...register('price', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })}
                  type="number" step="0.01" className={`${ic} pl-8`} placeholder="0.00" />
              </div>
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
            </div>

            {price > 0 && (
              <motion.div initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }}
                className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                  <div className="text-lg font-black text-gray-900">₦{Number(price).toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Customer pays</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
                  <div className="text-lg font-black text-red-600">₦{platformFee.toLocaleString()}</div>
                  <div className="text-xs text-red-400 mt-0.5">AfriCart (10%)</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                  <div className="text-lg font-black text-green-600">₦{vendorGets.toLocaleString()}</div>
                  <div className="text-xs text-green-500 mt-0.5">You receive (90%)</div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Category-specific fields */}
          {store.category === 'real_estate' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-black text-gray-900">Property Details</h2>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Listing Type *</label>
                <select {...register('property_type')} className={ic}>
                  <option value="">— Select type —</option>
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                  <option value="lease">Lease</option>
                  <option value="shortlet">Shortlet</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Bedrooms</label>
                  <input {...register('bedrooms')} type="number" min="0" className={ic} placeholder="3" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Bathrooms</label>
                  <input {...register('bathrooms')} type="number" min="0" className={ic} placeholder="2" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Area (m²)</label>
                  <input {...register('area_sqm')} type="number" min="0" className={ic} placeholder="120" />
                </div>
              </div>
            </div>
          )}

          {store.category === 'fashion' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-black text-gray-900">Variants</h2>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Available Sizes <span className="font-normal normal-case text-gray-400">(comma-separated)</span></label>
                <input {...register('sizes')} type="text" className={ic} placeholder="XS, S, M, L, XL, XXL" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Colors <span className="font-normal normal-case text-gray-400">(comma-separated)</span></label>
                <input {...register('colors')} type="text" className={ic} placeholder="Red, Blue, Black, White" />
              </div>
            </div>
          )}

          {/* Images */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-black text-gray-900">
              {store.category === 'food' ? 'Food Photo' : store.category === 'fashion' ? 'Product Photos' : 'Property Photos'}
            </h2>

            {/* Main image */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Main Photo</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-orange-300 transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="" className="w-full h-48 object-cover" />
                    <button type="button" onClick={() => { setImage(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center py-10 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setImage(f); setImagePreview(URL.createObjectURL(f)); }
                    }} />
                    <Upload className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Click to upload photo</p>
                    <p className="text-xs text-gray-300 mt-0.5">PNG/JPG/WebP · Max 5 MB</p>
                  </label>
                )}
              </div>
            </div>

            {/* Gallery (fashion + real estate) */}
            {store.category !== 'food' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Gallery <span className="font-normal normal-case text-gray-400">(up to 8)</span></label>
                <div className="grid grid-cols-4 gap-3">
                  {galleryPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => {
                        setGallery(p => p.filter((_,idx) => idx !== i));
                        setGalleryPreviews(p => p.filter((_,idx) => idx !== i));
                      }} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {galleryPreviews.length < 8 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        setGallery(p => [...p, ...files]);
                        setGalleryPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
                      }} />
                      <Plus className="w-5 h-5 text-gray-300" />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 text-sm">Available for order</p>
              <p className="text-xs text-gray-400 mt-0.5">Toggle off to hide from customers temporarily</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input {...register('is_available')} type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 text-sm">🔥 Mark as Popular / Featured</p>
              <p className="text-xs text-gray-400 mt-0.5">Shows a "Popular" badge and appears first</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input {...register('is_featured')} type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.push('/vendor/dashboard')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 disabled:opacity-60">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? 'Saving...' : 'Adding...'}</> : <>{isEdit ? 'Save Changes' : `Add ${catLabel(store.category)}`}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProductFormInner />
    </Suspense>
  );
}
