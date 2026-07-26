'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

const CONTENT: Record<string, { icon: React.ReactNode; title: string; desc: string; color: string }> = {
  success: {
    icon: <CheckCircle className="w-10 h-10 text-green-500" />,
    title: 'Email verified!',
    desc: 'Your account is now active. You can log in and start using Drovo.',
    color: 'bg-green-100',
  },
  already: {
    icon: <CheckCircle className="w-10 h-10 text-blue-500" />,
    title: 'Already verified',
    desc: 'This email was already confirmed — you can log in whenever you\'re ready.',
    color: 'bg-blue-100',
  },
  expired: {
    icon: <Clock className="w-10 h-10 text-amber-500" />,
    title: 'Link expired',
    desc: 'This verification link is more than 24 hours old. Please sign up again or request a new link.',
    color: 'bg-amber-100',
  },
  invalid: {
    icon: <XCircle className="w-10 h-10 text-red-500" />,
    title: 'Invalid link',
    desc: "We couldn't verify this link. It may have already been used or the URL might be incomplete.",
    color: 'bg-red-100',
  },
};

function VerifyResultInner() {
  const params = useSearchParams();
  const status = params.get('status') ?? 'invalid';
  const info = CONTENT[status] ?? CONTENT.invalid;

  return (
    <div className="min-h-screen pt-[64px] bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <div className={`w-20 h-20 ${info.color} rounded-full flex items-center justify-center mx-auto mb-5`}>
          {info.icon}
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">{info.title}</h2>
        <p className="text-gray-500 mb-6">{info.desc}</p>
        <Link href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">
          Go to Login <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}

export default function VerifyResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyResultInner />
    </Suspense>
  );
}