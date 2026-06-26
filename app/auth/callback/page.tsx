'use client';
import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function CallbackInner() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
          router.replace(data?.role === 'vendor' ? '/vendor/setup' : '/');
        });
      } else {
        router.replace('/auth/login?error=confirmation_failed');
      }
    });
  }, [router]);
  return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-600 font-medium">Confirming your account...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>}><CallbackInner/></Suspense>;
}
