'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, ShoppingBag, Store, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/supabase';

function SignupPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { signUp, isLoggedIn, loading } = useAuth();

  const roleParam = (searchParams.get('role') === 'vendor' ? 'vendor' : 'customer') as UserRole;

  const [role,       setRole]       = useState<UserRole>(roleParam);
  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    if (!loading && isLoggedIn) router.replace('/');
  }, [isLoggedIn, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(email, password, fullName, role);
    if (error) {
      setError(error.includes('already registered')
        ? 'An account with this email already exists. Try signing in.'
        : error
      );
      setSubmitting(false);
      return;
    }
    setSuccess(true);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-gray-50 focus:bg-white';

  if (success) {
    return (
      <div className="min-h-screen pt-[64px] bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Check your email!</h2>
          <p className="text-gray-500 mb-6">
            We sent a confirmation link to <span className="font-bold text-gray-800">{email}</span>.
            Click the link to activate your account.
          </p>
          <Link href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[64px] bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/60 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-8 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Create account</h1>
            <p className="text-orange-100 text-sm mt-1">Join Drovo today — it's free</p>
          </div>

          <div className="px-8 py-8">
            {/* Role picker */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {([
                { value: 'customer', label: 'Customer', desc: 'Browse & buy', icon: <ShoppingBag className="w-5 h-5" /> },
                { value: 'vendor',   label: 'Vendor',   desc: 'Sell & list',  icon: <Store className="w-5 h-5" /> },
              ] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                  className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
                    role === opt.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md shadow-orange-100'
                      : 'border-gray-200 text-gray-500 hover:border-orange-200 hover:bg-orange-50/50'
                  }`}>
                  {opt.icon}
                  <span className="font-black">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 mb-5 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" required value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className={`${inputClass} pl-10`} placeholder="Amara Johnson" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`${inputClass} pl-10`} placeholder="you@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputClass} pl-10 pr-10`} placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {password && (
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} required value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className={`${inputClass} pl-10 ${confirm && confirm !== password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                    placeholder="Repeat password" />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 mt-1 font-medium">Passwords don't match</p>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center pt-1">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-orange-500 hover:underline">Terms</Link> and{' '}
                <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>.
              </p>

              <button type="submit" disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account...</>
                ) : (
                  <>Create {role === 'vendor' ? 'Vendor' : 'Customer'} Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-orange-500 font-bold hover:text-orange-700">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { Suspense } from 'react';

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupPageInner />
    </Suspense>
  );
}
