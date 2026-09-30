'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoggedIn, loading, signOut } = useAuth();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Only allow same-site relative paths to avoid open redirects
  const rawNext = params.get('next') || '/vendor/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/vendor/dashboard';

  // Not logged in -> login. Already verified -> go on to the destination.
  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) { router.replace(`/auth/login?next=${encodeURIComponent(next)}`); return; }
    if (user?.email_confirmed_at) router.replace(next);
  }, [loading, isLoggedIn, user, next, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!user?.email || cooldown > 0) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setMsg(error ? error.message : 'Verification email sent. Check your inbox and spam folder.');
    if (!error) setCooldown(60);
    setBusy(false);
  }

  async function checkAgain() {
    setBusy(true);
    setMsg('');
    const { data, error } = await supabase.auth.refreshSession();
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (data.user?.email_confirmed_at) router.replace(next);
    else setMsg('Your email is still not verified. Click the link in the email we sent you.');
  }

  if (loading || !isLoggedIn) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Your account is not verified</h1>
        <p className="text-sm text-gray-500 mb-6">
          We sent a verification link to <b>{user?.email}</b>. Verify your email to access your dashboard.
        </p>
        {msg && <p className="text-sm text-orange-600 mb-4">{msg}</p>}
        <div className="space-y-2">
          <button
            onClick={checkAgain}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm disabled:opacity-60"
          >
            I've verified, continue
          </button>
          <button
            onClick={resend}
            disabled={busy || cooldown > 0}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm disabled:opacity-60"
          >
            {busy ? 'Please wait...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </button>
          <button
            onClick={async () => { await signOut(); router.push('/'); }}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}