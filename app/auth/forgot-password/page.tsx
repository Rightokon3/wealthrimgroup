'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit() {
    if (!email) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');

    try {
      const res = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSent(true);
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
          {!sent ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-5 shadow-lg shadow-orange-200">
                <Mail className="w-7 h-7 text-white" />
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-1">Forgot password?</h1>
              <p className="text-gray-400 text-sm mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="you@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-50 text-sm font-medium"
                  />
                </div>

                <button
                  onClick={handleSubmit} disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                </button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-gray-400 text-sm mb-6">
                We sent a reset link to <span className="font-bold text-gray-700">{email}</span>.
                Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm text-orange-500 font-bold hover:underline"
              >
                Try a different email
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}