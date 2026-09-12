import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const { user_id, email, full_name } = await req.json();

  if (!user_id || !email) {
    return NextResponse.json({ error: 'Missing user_id or email' }, { status: 400 });
  }

  const { rawToken, tokenHash, expiresAt } = generateVerificationToken();

  // Insert a NEW token row instead of overwriting — this means a resend
  // no longer invalidates an email that's still in flight.
  const { error } = await supabaseAdmin
    .from('rider_verification_tokens')
    .insert({
      user_id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const link = `${process.env.NEXT_PUBLIC_BASE_URL}/rider/verify-email?token=${rawToken}`;

  try {
    await sendVerificationEmail(email, full_name || 'Rider', link);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    return NextResponse.json(
      { error: 'Could not send verification email. Please try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}