'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

function VerifyPendingInner() {
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState('');
  const [cooldown,  setCooldown]  = useState(0);

  async function resend() {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/resend-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSent(true);
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen pt-[64px] bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Mail className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Verify your email</h2>
        <p className="text-gray-500 mb-6">
          {email
            ? <>We sent a confirmation link to <span className="font-bold text-gray-800">{email}</span>. Click it before signing in.</>
            : "You need to verify your email before signing in."}
        </p>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-left">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-xs font-medium">{error}</p>
          </div>
        )}
        {sent && !error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-xs font-medium">Verification email sent — check your inbox.</p>
          </div>
        )}

        <button onClick={resend} disabled={resending || cooldown > 0 || !email}
          className="w-full py-3 mb-3 rounded-xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50 disabled:opacity-50 transition-all">
          {resending ? 'Sending...' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
        </button>

        <Link href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">
          Back to Login <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}

export default function VerifyPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyPendingInner />
    </Suspense>
  );
}