'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, Trash2, Save, Loader2, Plus,
  Image as ImageIcon, Package, Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Store, CATEGORY_META } from '@/types';

interface Product {
  id: string;
  store_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

interface Props {
  store: Store;
  onClose: () => void;
  onUpdated: (store: Store) => void;
  onDeleted: (storeId: string) => void;
}

const BUCKET = 'store-assets';

export default function EditStoreModal({ store, onClose, onUpdated, onDeleted }: Props) {
  const [tab, setTab] = useState<'details' | 'products'>('details');
  const [form, setForm] = useState({
    name: store.name,
    city: store.city,
    phone: store.phone,
    category: store.category,
    logo_url: store.logo_url,
    cover_url: (store as any).cover_url ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSaving, setProductSaving] = useState(false);

  useEffect(() => {
    if (tab === 'products' && products.length === 0) fetchProducts();
  }, [tab]);

  async function fetchProducts() {
    setLoadingProducts(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });
    setProducts(data ?? []);
    setLoadingProducts(false);
  }

  // ---- Image upload ----
  async function handleImageUpload(file: File, field: 'logo_url' | 'cover_url') {
    setUploading(field === 'logo_url' ? 'logo' : 'cover');
    const ext = file.name.split('.').pop();
    const path = `${store.id}/${field}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
    });
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploading(null);
      return;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setForm(f => ({ ...f, [field]: pub.publicUrl }));
    setUploading(null);
  }

  function removeImage(field: 'logo_url' | 'cover_url') {
    setForm(f => ({ ...f, [field]: '' }));
  }

  // ---- Save store details ----
  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from('stores')
      .update({
        name: form.name,
        city: form.city,
        phone: form.phone,
        category: form.category,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
      })
      .eq('id', store.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      alert(`Save failed: ${error.message}`);
      return;
    }
    onUpdated(data);
  }

  // ---- Delete store ----
  async function handleDeleteStore() {
    setDeleting(true);
    const { error } = await supabase.from('stores').delete().eq('id', store.id);
    setDeleting(false);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    onDeleted(store.id);
  }

  // ---- Product actions ----
  async function saveProduct(p: Product) {
    setProductSaving(true);
    const { error } = await supabase
      .from('products')
      .update({ name: p.name, price: p.price, is_available: p.is_available })
      .eq('id', p.id);
    setProductSaving(false);
    if (error) {
      alert(`Product save failed: ${error.message}`);
      return;
    }
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    setEditingProduct(null);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { alert(`Delete failed: ${error.message}`); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function handleProductImageUpload(file: File, product: Product) {
    const ext = file.name.split('.').pop();
    const path = `${store.id}/products/${product.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (uploadError) { alert(`Upload failed: ${uploadError.message}`); return; }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    await supabase.from('products').update({ image_url: pub.publicUrl }).eq('id', product.id);
    setProducts(prev => prev.map(x => x.id === product.id ? { ...x, image_url: pub.publicUrl } : x));
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h2 className="font-black text-white text-lg">{store.name}</h2>
              <p className="text-xs text-gray-500">Manage vendor store</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-3">
            {[
              { id: 'details', label: 'Details', icon: <Info className="w-3.5 h-3.5" /> },
              { id: 'products', label: 'Products', icon: <Package className="w-3.5 h-3.5" /> },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-bold border-b-2 transition-all ${
                  tab === t.id ? 'text-orange-400 border-orange-500' : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto p-5 space-y-5">
            {tab === 'details' ? (
              <>
                {/* Cover image */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cover / Hero Image</label>
                  <div className="mt-1.5 relative h-32 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center">
                    {form.cover_url ? (
                      <img src={form.cover_url} className="w-full h-full object-cover" alt="Cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-700" />
                    )}
                    {uploading === 'cover' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <label className="cursor-pointer bg-gray-900/90 hover:bg-gray-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Upload
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover_url')} />
                      </label>
                      {form.cover_url && (
                        <button onClick={() => removeImage('cover_url')}
                          className="bg-red-900/80 hover:bg-red-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Logo</label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {form.logo_url ? (
                        <img src={form.logo_url} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-700" />
                      )}
                      {uploading === 'logo' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-gray-700">
                      <Upload className="w-3.5 h-3.5" /> Upload
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo_url')} />
                    </label>
                    {form.logo_url && (
                      <button onClick={() => removeImage('logo_url')}
                        className="text-xs font-bold text-red-400 hover:text-red-300 px-2">
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Store Name</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">City</label>
                    <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-orange-500">
                      {Object.entries(CATEGORY_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.icon} {meta.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Save / Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete this store
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400 font-bold">Delete permanently?</span>
                      <button onClick={handleDeleteStore} disabled={deleting}
                        className="text-xs font-bold bg-red-900/40 text-red-400 border border-red-800 px-2.5 py-1 rounded-lg disabled:opacity-50">
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDelete(false)}
                        className="text-xs font-bold text-gray-400 px-2.5 py-1">
                        Cancel
                      </button>
                    </div>
                  )}

                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {loadingProducts ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-800 rounded-xl h-16 border border-gray-700" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-10 text-gray-600 text-sm">No products for this store.</div>
                ) : (
                  <div className="space-y-2">
                    {products.map(p => (
                      <div key={p.id} className="bg-gray-800/60 rounded-xl border border-gray-700 p-3 flex items-center gap-3">
                        <label className="relative w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 cursor-pointer group">
                          {p.image_url
                            ? <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-700" /></div>
                          }
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-3.5 h-3.5 text-white" />
                          </div>
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && handleProductImageUpload(e.target.files[0], p)} />
                        </label>

                        {editingProduct?.id === p.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input value={editingProduct.name}
                              onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs" />
                            <input type="number" value={editingProduct.price}
                              onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                              className="w-20 px-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs" />
                            <button onClick={() => saveProduct(editingProduct)} disabled={productSaving}
                              className="text-green-400 text-xs font-bold px-2">Save</button>
                            <button onClick={() => setEditingProduct(null)}
                              className="text-gray-500 text-xs font-bold px-1">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{p.name}</div>
                              <div className="text-xs text-gray-500">₦{p.price.toLocaleString()} · {p.is_available ? 'Available' : 'Unavailable'}</div>
                            </div>
                            <button onClick={() => setEditingProduct(p)}
                              className="text-xs font-bold text-gray-400 hover:text-white px-2">Edit</button>
                            <button onClick={() => deleteProduct(p.id)}
                              className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}