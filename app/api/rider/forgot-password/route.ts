import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateVerificationToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const { data: rider } = await supabaseAdmin
    .from('riders')
    .select('user_id, full_name, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!rider) {
    return NextResponse.json(
      { error: 'No rider account found with that email.' },
      { status: 404 }
    );
  }

  const { rawToken, tokenHash, expiresAt } = generateVerificationToken();

  const { error } = await supabaseAdmin.from('password_reset_tokens').insert({
    user_id: rider.user_id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('Failed to store password reset token:', error);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }

  const link = `${process.env.NEXT_PUBLIC_BASE_URL}/rider/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(rider.email!, rider.full_name || 'Rider', link);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    return NextResponse.json(
      { error: 'Could not send the reset email. Try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'A password reset link has been sent to your email.',
  });
}