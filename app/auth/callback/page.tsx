'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackInner() {
  const router = useRouter();

  useEffect(() => {
    // Supabase puts the token in the URL hash — exchangeCodeForSession handles it
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check role and redirect appropriately
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === 'vendor') {
              router.replace('/vendor/dashboard');
            } else {
              router.replace('/');
            }
          });
      } else {
        router.replace('/auth/login?error=confirmation_failed');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Confirming your account...</p>
      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
