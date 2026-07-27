'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "This reset link isn't valid. It may have already been used.",
  used:    'This reset link has already been used. Request a new one if you still need to reset your password.',
  expired: 'This reset link has expired. Reset links are only valid for 1 hour.',
};

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token  = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  async function handleSubmit() {
    setError('');
    if (!token) { setError('Missing reset token — please use the link from your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(ERROR_MESSAGES[data.error] ?? data.error);
        setLoading(false);
        return;
      }
      setDone(true);
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
          {done ? (
            <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Password reset!</h2>
              <p className="text-gray-400 text-sm mb-6">You can now sign in with your new password.</p>
              <Link href="/auth/login"
                className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl text-sm">
                Go to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-5 shadow-lg shadow-orange-200">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Set a new password</h1>
              <p className="text-gray-400 text-sm mb-6">Choose a new password for your account.</p>

              {error && (
                <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {error}
                    {(error === ERROR_MESSAGES.invalid || error === ERROR_MESSAGES.used || error === ERROR_MESSAGES.expired) && (
                      <> <Link href="/auth/forgot-password" className="underline font-bold">Request a new link</Link>.</>
                    )}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`${ic} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                  <input
                    type={showPass ? 'text' : 'password'} value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Repeat password"
                    className={ic}
                  />
                </div>
                <button
                  onClick={handleSubmit} disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}