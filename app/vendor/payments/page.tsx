'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WalletPanel from '@/components/wallet/WalletPanel';

export default function VendorPayments() {
  const router = useRouter();
  const { user, isVendor, isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) { router.replace('/auth/login?next=/vendor/payments'); return; }
    if (user && !user.email_confirmed_at) { router.replace('/auth/verify-email?next=/vendor/payments'); return; }
    if (!isVendor) router.replace('/');
  }, [loading, isLoggedIn, isVendor, user, router]);

  if (loading || !user || !isVendor || !user.email_confirmed_at) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/vendor/dashboard" aria-label="Back to dashboard"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-900">Payments</h1>
            <p className="text-xs text-gray-400">Your earnings, bank account and withdrawals</p>
          </div>
        </div>
        <WalletPanel role="vendor" userId={user.id} />
      </div>
    </div>
  );
}