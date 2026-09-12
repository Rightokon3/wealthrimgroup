'use client';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bike, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!token) { setError('Missing or invalid reset link.'); return; }
    if (!password || !confirm) { setError('Fill in both fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/rider/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset password.');
      setDone(true);
      setTimeout(() => router.replace('/rider/login'), 2500);
    } catch (e: any) {
      setError(e.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-1">Choose a new password for your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Password reset. Redirecting you to login…
              </p>
            </div>
          ) : !token ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                This reset link is missing or invalid. Request a new one from the{' '}
                <Link href="/rider/forgot-password" className="text-green-600 font-bold hover:underline">
                  forgot password
                </Link>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium pr-11"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'} value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Re-enter your new password"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
                />
              </div>

              <button
                onClick={handleSubmit} disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordInner />
    </Suspense>
  );
}