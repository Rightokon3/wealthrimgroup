'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, ShieldPlus, ShieldOff, Pencil,
  X, Loader2, ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types';

export default function ManageAdmins() {
  const { user } = useAuth();
  const [admins,   setAdmins]   = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  const [showAdd,  setShowAdd]  = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addBusy,  setAddBusy]  = useState(false);
  const [addError, setAddError] = useState('');

  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editName,  setEditName]  = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity,  setEditCity]  = useState('');
  const [editBusy,  setEditBusy]  = useState(false);

  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null);
  const [removeBusy,   setRemoveBusy]   = useState(false);
  const [removeError,  setRemoveError]  = useState('');

  useEffect(() => { fetchAdmins(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(admins); return; }
    const q = search.toLowerCase();
    setFiltered(admins.filter(a =>
      a.full_name?.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q)
    ));
  }, [admins, search]);

  async function fetchAdmins() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });
    setAdmins(data ?? []);
    setLoading(false);
  }

  async function addAdmin() {
    if (!addEmail.trim()) return;
    setAddBusy(true);
    setAddError('');

    // We can only promote an EXISTING user to admin — creating a brand new
    // auth user needs the service-role key, which never belongs in client
    // code. Ask the person to sign up first, then grant them access here.
    const { data: existing, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', addEmail.trim().toLowerCase())
      .maybeSingle();

    if (findError || !existing) {
      setAddBusy(false);
      setAddError('No user found with that email. They need to sign up first.');
      return;
    }
    if (existing.role === 'admin') {
      setAddBusy(false);
      setAddError('This user is already an admin.');
      return;
    }

    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', existing.id);
    setAddBusy(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setShowAdd(false);
    setAddEmail('');
    fetchAdmins();
  }

  function openEdit(a: Profile) {
    setEditTarget(a);
    setEditName(a.full_name ?? '');
    setEditPhone(a.phone ?? '');
    setEditCity(a.city ?? '');
  }

  async function saveEdit() {
    if (!editTarget) return;
    setEditBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName, phone: editPhone, city: editCity })
      .eq('id', editTarget.id);
    setEditBusy(false);
    if (!error) {
      setAdmins(prev => prev.map(a => a.id === editTarget.id
        ? { ...a, full_name: editName, phone: editPhone, city: editCity }
        : a));
      setEditTarget(null);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    if (removeTarget.id === user?.id) {
      setRemoveError("You can't remove your own admin access from here.");
      return;
    }
    setRemoveBusy(true);
    setRemoveError('');
    // Demotes to a regular account. Fully deleting the auth user requires
    // a service-role backend call and isn't done from the client.
    const { error } = await supabase.from('profiles').update({ role: 'customer' }).eq('id', removeTarget.id);
    setRemoveBusy(false);
    if (error) {
      setRemoveError(error.message);
      return;
    }
    setAdmins(prev => prev.filter(a => a.id !== removeTarget.id));
    setRemoveTarget(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Manage Admins</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} admins</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAdmins}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors">
            <ShieldPlus className="w-4 h-4" /> Add Admin
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search admins..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Admin', 'Phone', 'City', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-800 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-600">No admins found.</td></tr>
              ) : filtered.map(a => (
                <motion.tr key={a.id} layout className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{a.full_name ?? '—'}</span>
                      {a.id === user?.id && (
                        <span className="text-[10px] bg-orange-900/40 text-orange-400 border border-orange-800 px-1.5 py-0.5 rounded-full font-bold">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.city ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 transition-all">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => { setRemoveTarget(a); setRemoveError(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40 transition-all">
                        <ShieldOff className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add admin modal */}
      <AnimatePresence>
        {showAdd && (
          <Modal onClose={() => { setShowAdd(false); setAddError(''); }}>
            <h3 className="font-black text-white flex items-center gap-2 mb-1">
              <ShieldPlus className="w-4 h-4 text-orange-500" /> Add Admin
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Grant admin access to an existing user by email. They must already have an account.
            </p>
            <input
              value={addEmail} onChange={e => setAddEmail(e.target.value)}
              type="email" placeholder="user@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 mb-2"
            />
            {addError && <p className="text-xs text-red-400 mb-2">{addError}</p>}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700">Cancel</button>
              <button onClick={addAdmin} disabled={addBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                {addBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Grant Access
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit admin modal */}
      <AnimatePresence>
        {editTarget && (
          <Modal onClose={() => setEditTarget(null)}>
            <h3 className="font-black text-white flex items-center gap-2 mb-4">
              <Pencil className="w-4 h-4 text-orange-500" /> Edit {editTarget.full_name ?? 'Admin'}
            </h3>
            <div className="space-y-3">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
              <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
              <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="City"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700">Cancel</button>
              <button onClick={saveEdit} disabled={editBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                {editBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Remove admin confirm */}
      <AnimatePresence>
        {removeTarget && (
          <Modal onClose={() => setRemoveTarget(null)}>
            <h3 className="font-black text-red-400 flex items-center gap-2 mb-2">
              <ShieldOff className="w-4 h-4" /> Remove Admin Access
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              This revokes admin access for{' '}
              <span className="text-white font-bold">{removeTarget.full_name ?? removeTarget.email}</span>.
              They'll drop to a regular account. This won't delete their user record.
            </p>
            {removeError && <p className="text-xs text-red-400 mb-3">{removeError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setRemoveTarget(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700">Cancel</button>
              <button onClick={confirmRemove} disabled={removeBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {removeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove Access'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-5 w-full max-w-sm relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}