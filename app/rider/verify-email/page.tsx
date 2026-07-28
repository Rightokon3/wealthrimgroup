'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/rider/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed.');
        setStatus('success');
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || 'Verification failed.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center"
      >
        {status === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-black text-gray-900">Verifying your email…</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-900">Email verified!</h1>
            <p className="text-gray-400 text-sm mt-2">Your rider account is now active.</p>
            <button
              onClick={() => router.replace('/rider/dashboard')}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-black text-gray-900">Verification failed</h1>
            <p className="text-gray-400 text-sm mt-2">{message}</p>
            <Link
              href="/rider/verify-pending"
              className="block w-full mt-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Request a new link
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8 text-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-black text-gray-900">Loading…</h1>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}