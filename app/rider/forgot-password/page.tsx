'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bike, Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function RiderForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email) { setError('Enter your email.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rider/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
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
          <h1 className="text-2xl font-black text-gray-900">Forgot Password</h1>
          <p className="text-gray-400 text-sm mt-1">We'll email you a reset link</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                A password reset link has been sent to <span className="font-bold">{email}</span>. Check your inbox.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 text-sm font-medium"
                />
              </div>

              <button
                onClick={handleSubmit} disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Remembered it?{' '}
          <Link href="/rider/login" className="text-green-600 font-bold hover:underline">Back to login</Link>
        </p>
      </motion.div>
    </div>
  );
}