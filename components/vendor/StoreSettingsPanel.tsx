'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Trash2, Save, Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Store, CATEGORY_META } from '@/types';

interface Props {
  store: Store;
  vendorId: string;
  onUpdated: (store: Store) => void;
  onDeleted: () => void;
}

export default function StoreSettingsPanel({ store, vendorId, onUpdated, onDeleted }: Props) {
  const [form, setForm] = useState({
    name: store.name,
    city: store.city,
    phone: store.phone,
    category: store.category,
    logo_url: store.logo_url,
    cover_url: (store as any).cover_url ?? '',
  });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');

  async function handleImageUpload(file: File, field: 'logo_url' | 'cover_url') {
    setUploading(field === 'logo_url' ? 'logo' : 'cover');
    setError('');
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `stores/${vendorId}/${field}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('africart').upload(path, file, { upsert: true });
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(null);
      return;
    }

    const { data: pub } = supabase.storage.from('africart').getPublicUrl(path);
    setForm(f => ({ ...f, [field]: pub.publicUrl }));
    setUploading(null);
  }

  function removeImage(field: 'logo_url' | 'cover_url') {
    setForm(f => ({ ...f, [field]: '' }));
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    const { data, error: err } = await supabase
      .from('stores')
      .update({
        name:      form.name,
        city:      form.city,
        phone:     form.phone,
        category:  form.category,
        logo_url:  form.logo_url || null,
        cover_url: form.cover_url || null,
      })
      .eq('id', store.id)
      .eq('vendor_id', vendorId) // extra guard — a vendor can only ever update their own store
      .select()
      .single();

    setSaving(false);
    if (err) { setError(`Save failed: ${err.message}`); return; }
    onUpdated(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDeleteStore() {
    setDeleting(true); setError('');
    const { error: err } = await supabase
      .from('stores')
      .delete()
      .eq('id', store.id)
      .eq('vendor_id', vendorId);

    setDeleting(false);
    if (err) { setError(`Delete failed: ${err.message}`); return; }
    onDeleted();
  }

  const ic = 'mt-1.5 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-5">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-black text-gray-900">Store Details</h2>

        {/* Cover image */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cover / Hero Image</label>
          <div className="mt-1.5 relative h-32 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
            {form.cover_url ? (
              <img src={form.cover_url} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-300" />
            )}
            {uploading === 'cover' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex gap-2">
              <label className="cursor-pointer bg-white/95 hover:bg-white text-gray-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                <Upload className="w-3.5 h-3.5" /> Upload
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover_url')} />
              </label>
              {form.cover_url && (
                <button onClick={() => removeImage('cover_url')}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow">
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
            <div className="relative w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-300" />
              )}
              {uploading === 'logo' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
            </div>
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-gray-200">
              <Upload className="w-3.5 h-3.5" /> Upload
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo_url')} />
            </label>
            {form.logo_url && (
              <button onClick={() => removeImage('logo_url')}
                className="text-xs font-bold text-red-500 hover:text-red-600 px-2">
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Store Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={ic} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={ic} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={ic} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className={ic}>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.icon} {meta.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm px-6 py-3 rounded-xl disabled:opacity-60 hover:from-orange-600 hover:to-red-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="font-black text-red-600 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-400 mb-4">Deleting your store removes it and its listing permanently. Your products and order history are not affected by this action alone, but customers will no longer be able to find or order from you.</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" /> Delete this store
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-bold">Are you sure? This can't be undone.</span>
            <button onClick={handleDeleteStore} disabled={deleting}
              className="text-sm font-bold bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="text-sm font-bold text-gray-400 px-3 py-1.5">
              Cancel
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}