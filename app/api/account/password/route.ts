import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';

// POST { current, next } — change password. The current password must be right, and after
// 5 wrong tries in a row this is locked for 15 minutes (same protection as login).
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;

  const { current, next } = await req.json().catch(() => ({}));
  if (typeof current !== 'string' || typeof next !== 'string' || !current) {
    return NextResponse.json({ error: 'Fill in every field.' }, { status: 400 });
  }
  if (next.length < 8) return NextResponse.json({ error: 'The new password must be at least 8 characters.' }, { status: 400 });
  if (next.length > 72) return NextResponse.json({ error: 'The new password is too long.' }, { status: 400 });
  if (next === current) return NextResponse.json({ error: 'Choose a password different from your current one.' }, { status: 400 });

  const key = `pw:${user.id}`;
  const { data: wait } = await supabaseAdmin.rpc('login_locked_seconds', { p_key: key });
  if (Number(wait ?? 0) > 0) {
    const m = Math.max(1, Math.ceil(Number(wait) / 60));
    return NextResponse.json({ error: `Too many wrong attempts. Try again in ${m} minute${m === 1 ? '' : 's'}.` }, { status: 429 });
  }

  // Check the current password without touching the user's own session
  const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: badPw } = await probe.auth.signInWithPassword({ email: user.email!, password: current });
  if (badPw) {
    await supabaseAdmin.rpc('login_record_fail', { p_key: key, p_max: 5, p_window_minutes: 15, p_lock_minutes: 15 });
    return NextResponse.json({ error: 'Your current password is not correct.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: next });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.rpc('login_clear', { p_key: key });
  await supabaseAdmin.from('notifications').insert({
    user_id: user.id, type: 'security', title: 'Password changed',
    body: 'Your Drovo password was just changed. If this was not you, contact support right away.',
  });
  return NextResponse.json({ success: true });
}