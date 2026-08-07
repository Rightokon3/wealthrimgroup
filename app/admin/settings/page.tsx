'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Lock, Save, LogOut,
  AlertTriangle, Loader2, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types';

export default function AdminSettings() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone,    setPhone]    = useState('');
  const [city,     setCity]     = useState('');
  const [email,    setEmail]    = useState('');

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg,    setPwMsg]    = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setProfile(data);
      setFullName(data.full_name ?? '');
      setPhone(data.phone ?? '');
      setCity(data.city ?? '');
      setEmail(data.email ?? user.email ?? '');
    }
    setLoading(false);
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setSavedMsg('');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, city })
      .eq('id', user.id);

    // Email lives on the auth user, not the profiles row — changing it
    // triggers Supabase's confirmation email flow.
    let emailError = null as { message: string } | null;
    if (email && email !== (profile?.email ?? user.email)) {
      const { error } = await supabase.auth.updateUser({ email });
      emailError = error;
    }

    setSaving(false);
    if (profileError || emailError) {
      setSavedMsg((profileError?.message || emailError?.message) ?? 'Something went wrong.');
    } else {
      setSavedMsg('Profile updated.');
      fetchProfile();
    }
    setTimeout(() => setSavedMsg(''), 4000);
  }

  async function changePassword() {
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated.' });
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
  }

  async function deleteAccount() {
    if (confirmDelete !== 'DELETE' || !user) return;
    setDeleting(true);
    setDeleteError('');

    // Deleting an auth user requires the service-role key, which must never
    // ship to the client. This RPC should wrap auth.admin.deleteUser(uid)
    // behind a SECURITY DEFINER function on the backend — create it in
    // Supabase before wiring this button up for real.
    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
      setDeleting(false);
      setDeleteError(error.message || 'Could not delete account. Contact a super admin.');
      return;
    }

    await signOut();
    router.push('/auth/login');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your admin account</p>
      </div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="font-black text-white flex items-center gap-2">
          <User className="w-4 h-4 text-orange-500" /> Profile Information
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name" icon={<User className="w-4 h-4" />}>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
          </Field>
          <Field label="Email" icon={<Mail className="w-4 h-4" />}>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
          </Field>
          <Field label="Phone" icon={<Phone className="w-4 h-4" />}>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
          </Field>
          <Field label="City" icon={<MapPin className="w-4 h-4" />}>
            <input value={city} onChange={e => setCity(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={saveProfile} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          {savedMsg && <span className="text-xs text-gray-400">{savedMsg}</span>}
        </div>
      </motion.div>

      {/* Change password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
        <h2 className="font-black text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-orange-500" /> Change Password
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="New Password">
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password"
              placeholder="At least 8 characters"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500" />
          </Field>
          <Field label="Confirm Password">
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={changePassword} disabled={pwSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 border border-gray-700">
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
          {pwMsg && (
            <span className={`text-xs flex items-center gap-1 ${pwMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
              {pwMsg.type === 'ok' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {pwMsg.text}
            </span>
          )}
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex items-center justify-between">
        <div>
          <h2 className="font-black text-white">Sign Out</h2>
          <p className="text-gray-500 text-xs mt-0.5">End your current session on this device</p>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700 transition-colors border border-gray-700">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </motion.div>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-red-950/20 rounded-2xl border border-red-900/50 p-5 space-y-4">
        <h2 className="font-black text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h2>
        <p className="text-gray-400 text-xs">
          Deleting your account permanently removes your admin profile and revokes access. This cannot be undone.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="flex-1 bg-gray-900 border border-red-900/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={deleteAccount}
            disabled={confirmDelete !== 'DELETE' || deleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Delete Account
          </button>
        </div>
        {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
      </motion.div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}