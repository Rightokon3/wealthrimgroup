import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Missing token or new password' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    const { data: record } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    if (record.used_at) {
      return NextResponse.json({ error: 'used' }, { status: 400 });
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(record.user_id, {
      password: newPassword,
    });
    if (updateErr) throw new Error(updateErr.message);

    await supabaseAdmin
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to reset password' }, { status: 500 });
  }
}