import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const { data: tokenRow, error: findErr } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (findErr || !tokenRow) {
    return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired. Request a new one.' }, { status: 400 });
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(tokenRow.user_id, {
    password,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Invalidate every outstanding reset token for this user
  await supabaseAdmin.from('password_reset_tokens').delete().eq('user_id', tokenRow.user_id);

  return NextResponse.json({ success: true });
}