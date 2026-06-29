'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type PageState = 'loading' | 'ready' | 'success' | 'invalid';

export default function ResetPassword() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash.
    // onAuthStateChange fires with PASSWORD_RECOVERY event when valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      } else if (event === 'SIGNED_IN' && pageState === 'loading') {
        // Already signed in, token may have expired or been used
        setPageState('invalid');
      }
    });

    // Fallback: if no event fires within 3s, link is likely invalid/expired
    const timeout = setTimeout(() => {
      setPageState(s => s === 'loading' ? 'invalid' : s);
    }, 3000);

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  async function handleReset() {
    if (!password) { setError('Enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true); setError('');

    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) { setError(err.message); setLoading(false); return; }

    setPageState('success');
    setTimeout(() => router.replace('/auth/login'), 2500);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">

          {/* Loading */}
          {pageState === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm font-medium">Verifying your reset link...</p>
            </div>
          )}

          {/* Invalid / expired */}
          {pageState === 'invalid' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Link expired</h2>
              <p className="text-gray-400 text-sm mb-6">
                This reset link has expired or already been used. Request a new one.
              </p>
              <button
                onClick={() => router.replace('/auth/forgot-password')}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl text-sm hover:from-orange-600 hover:to-red-700 transition-all"
              >
                Request New Link
              </button>
            </div>
          )}

          {/* Ready — set new password */}
          {pageState === 'ready' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-5 shadow-lg shadow-orange-200">
                <Lock className="w-7 h-7 text-white" />
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-1">Set new password</h1>
              <p className="text-gray-400 text-sm mb-6">Choose a strong password for your account.</p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Min. 6 characters"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-50 text-sm font-medium pr-11"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-50 text-sm font-medium"
                  />
                </div>

                {/* Strength indicator */}
                {password && (
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        password.length >= i * 3
                          ? i <= 1 ? 'bg-red-400'
                          : i <= 2 ? 'bg-amber-400'
                          : i <= 3 ? 'bg-blue-400'
                          : 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}

                <button
                  onClick={handleReset} disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </>
          )}

          {/* Success */}
          {pageState === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Password updated!</h2>
              <p className="text-gray-400 text-sm">Redirecting you to login...</p>
            </motion.div>
          )}

        </div>
      </motion.div>
    </div>
  );
}