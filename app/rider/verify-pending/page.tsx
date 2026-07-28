'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MailCheck, Loader2 } from 'lucide-react';

function VerifyPendingInner() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const userId = params.get('uid') || '';
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function resend() {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/rider/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to resend email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
          <MailCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">Check your email</h1>
        <p className="text-gray-400 text-sm mt-2">
          We sent a verification link to{' '}
          <span className="font-bold text-gray-600">{email || 'your inbox'}</span>. Click it to activate your rider account.
        </p>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}
        {sent && !error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-600 text-sm font-medium">
            Verification email resent.
          </div>
        )}

        <button
          onClick={resend}
          disabled={sending || !userId}
          className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resend email'}
        </button>
      </motion.div>
    </div>
  );
}

function VerifyPendingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-black text-gray-900">Loading…</h1>
      </div>
    </div>
  );
}

export default function VerifyPending() {
  return (
    <Suspense fallback={<VerifyPendingFallback />}>
      <VerifyPendingInner />
    </Suspense>
  );
}