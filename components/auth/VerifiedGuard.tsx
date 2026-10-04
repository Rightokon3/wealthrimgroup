'use client';
// Wrap any customer-only area with this. Children are NOT rendered (so they cannot
// fetch any data) until the visitor is logged in AND has verified their email.
//
// This is the user-experience layer. The real security is Supabase's "Confirm email"
// setting plus the database policies in supabase_require_verified_email.sql.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifiedGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, loading } = useAuth();

  const verified = !!user?.email_confirmed_at;

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn || !user) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!verified) {
      router.replace(`/auth/verify-email?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isLoggedIn, user, verified, pathname, router]);

  if (loading || !isLoggedIn || !verified) {
    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}