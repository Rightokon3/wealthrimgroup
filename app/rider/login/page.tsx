'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bike, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RiderLogin() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setLoading(true); setError(''); setUnverifiedUserId(null);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Login failed.'); setLoading(false); return;
    }

    // Verify this user is actually a rider
    const { data: rider } = await supabase
      .from('riders')
      .select('id, is_active, email_verified')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!rider) {
      await supabase.auth.signOut();
      setError('No rider account found for this email.');
      setLoading(false); return;
    }
    if (!rider.email_verified) {
      await supabase.auth.signOut();
      setUnverifiedUserId(data.user.id);
      setError('Your email hasn\'t been verified yet.');
      setLoading(false); return;
    }
    if (!rider.is_active) {
      await supabase.auth.signOut();
      setError('Your account has been deactivated. Contact support.');
      setLoading(false); return;
    }

    router.replace('/rider/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Rider Login</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your delivery dashboard</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
              {unverifiedUserId && (
                <>
                  {' '}
                  <Link
                    href={`/rider/verify-pending?email=${encodeURIComponent(email)}&uid=${unverifiedUserId}`}
                    className="underline font-bold hover:text-red-700"
                  >
                    Verify your email
                  </Link>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); setUnverifiedUserId(null); }}
              placeholder="you@email.com"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); setUnverifiedUserId(null); }}
                placeholder="Your password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium pr-11"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Not a rider yet?{' '}
          <Link href="/rider/signup" className="text-green-600 font-bold hover:underline">Apply now</Link>
        </p>
      </motion.div>
    </div>
  );
}