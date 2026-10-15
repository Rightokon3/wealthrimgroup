import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST { email, password }
// Logs the user in on the SERVER so wrong passwords can be counted.
//   5 wrong passwords for one email  -> that email is locked for 15 minutes
//   20 wrong passwords from one IP   -> that IP is locked for 15 minutes
// On success it returns the session; the browser then calls supabase.auth.setSession(...).
const EMAIL_MAX = 5;
const IP_MAX = 20;
const WINDOW_MIN = 15;
const LOCK_MIN = 15;

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function locked(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return NextResponse.json(
    { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, retryAfter: seconds },
    { status: 429, headers: { 'Retry-After': String(seconds) } },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password || email.length > 254) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
  const eKey = `e:${email}`;
  const iKey = `ip:${ip}`;

  // Already locked? Refuse before even checking the password.
  const [le, li] = await Promise.all([
    supabaseAdmin.rpc('login_locked_seconds', { p_key: eKey }),
    supabaseAdmin.rpc('login_locked_seconds', { p_key: iKey }),
  ]);
  const wait = Math.max(Number(le.data ?? 0), Number(li.data ?? 0));
  if (wait > 0) return locked(wait);

  const { data, error } = await anon().auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    // Wrong password / unknown email look identical, so nobody can discover which emails exist.
    const status = (error as any)?.status;
    if (status && status >= 500) {
      return NextResponse.json({ error: 'Login is temporarily unavailable. Try again shortly.' }, { status: 503 });
    }
    // A real "email not confirmed" message is useful and is not a guess, so show it and do not count it.
    if (/not confirmed/i.test(error?.message ?? '')) {
      return NextResponse.json({ error: 'Please verify your email first.', code: 'email_not_confirmed' }, { status: 403 });
    }
    const [se, si] = await Promise.all([
      supabaseAdmin.rpc('login_record_fail', { p_key: eKey, p_max: EMAIL_MAX, p_window_minutes: WINDOW_MIN, p_lock_minutes: LOCK_MIN }),
      supabaseAdmin.rpc('login_record_fail', { p_key: iKey, p_max: IP_MAX, p_window_minutes: WINDOW_MIN, p_lock_minutes: LOCK_MIN }),
    ]);
    const nowLocked = Math.max(Number(se.data ?? 0), Number(si.data ?? 0));
    if (nowLocked > 0) return locked(nowLocked);
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  await supabaseAdmin.rpc('login_clear', { p_key: eKey });   // good login resets this email's counter
  return NextResponse.json({
    session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
  });
}