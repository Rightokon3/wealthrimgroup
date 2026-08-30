'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bike, Eye, EyeOff, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type VehicleType = 'motorcycle' | 'bicycle' | 'car';

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
  { value: 'bicycle',    label: 'Bicycle',    icon: '🚲' },
  { value: 'car',        label: 'Car',         icon: '🚗' },
];

export default function RiderSignup() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', city: '',
    vehicle_type: 'motorcycle' as VehicleType,
    vehicle_plate: '',
  });

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit() {
    if (!form.full_name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all required fields.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setLoading(true);
    setError('');

    // 1. Create auth user with rider role in metadata
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: 'rider' },
      },
    });

    if (authErr || !authData.user) {
      setError(authErr?.message ?? 'Signup failed. Try again.');
      setLoading(false); return;
    }

    // 2. Insert into riders table
const { error: riderErr } = await supabase.from('riders').insert({
  user_id:       authData.user.id,
  full_name:     form.full_name,
  phone:         form.phone,
  city:          form.city.trim(),
  vehicle_type:  form.vehicle_type,
  vehicle_plate: form.vehicle_plate || null,
});

    if (riderErr) {
      // Insert failed — don't leave a stranded auth account behind.
      // Otherwise this email is permanently stuck: login fails (no riders
      // row) and signup fails (auth user already exists).
      fetch('/api/rider/cleanup-orphan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      }).catch(() => {
        // Best-effort — if this also fails, at least the person sees the
        // real error below instead of a silent limbo state.
      });

      setError(riderErr.message);
      setLoading(false); return;
    }

    // 3. Trigger verification email — fire and forget, don't block navigation
    fetch('/api/rider/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authData.user.id,
        email: form.email,
        full_name: form.full_name,
      }),
    }).catch(() => {
      // Non-fatal — rider can resend from the verify-pending page.
    });

    router.replace(
      `/rider/verify-pending?email=${encodeURIComponent(form.email)}&uid=${authData.user.id}`
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Become a Rider</h1>
          <p className="text-gray-400 text-sm mt-1">Earn money delivering across the city</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="font-black text-gray-900 mb-4">Personal Details</h2>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name *</label>
                <input
                  type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
                <input
                  type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="you@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone *</label>
                <input
                  type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="080XXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">City *</label>
                <input
                  type="text" value={form.city} onChange={e => set('city', e.target.value)}
                  placeholder="e.g. Lagos"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
                />
                <p className="text-xs text-gray-400 mt-1">Used to match you with nearby delivery orders.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium pr-11"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!form.full_name || !form.email || !form.phone || !form.city || !form.password) {
                    setError('Please fill in all fields.'); return;
                  }
                  setError(''); setStep(2);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all mt-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="font-black text-gray-900 mb-4">Vehicle Details</h2>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Vehicle Type *</label>
                <div className="grid grid-cols-3 gap-3">
                  {VEHICLE_OPTIONS.map(v => (
                    <button
                      key={v.value}
                      onClick={() => set('vehicle_type', v.value)}
                      className={`py-3 rounded-xl border-2 text-center transition-all ${
                        form.vehicle_type === v.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{v.icon}</div>
                      <div className="text-xs font-bold text-gray-700">{v.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Plate Number <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text" value={form.vehicle_plate} onChange={e => set('vehicle_plate', e.target.value.toUpperCase())}
                  placeholder="e.g. LAG-123-AB"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium font-mono"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 border-2 border-gray-200 text-gray-600 font-black rounded-xl hover:border-gray-300 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already a rider?{' '}
          <Link href="/rider/login" className="text-green-600 font-bold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}