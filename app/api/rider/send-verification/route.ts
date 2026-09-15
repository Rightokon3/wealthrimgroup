import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { user_id, email, full_name } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: 'Missing user_id or email' }, { status: 400 });
    }

    // Confirm this user actually has a riders row before sending anything.
    const { data: rider } = await supabaseAdmin
      .from('riders')
      .select('id, email_verified, full_name')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!rider) {
      return NextResponse.json({ error: 'No rider account found for this user.' }, { status: 404 });
    }

    if (rider.email_verified) {
      return NextResponse.json({ error: 'This account is already verified.' }, { status: 400 });
    }

    const { rawToken, tokenHash, expiresAt } = generateVerificationToken();

    // New token row per send — a resend doesn't invalidate an email that's
    // already in flight.
    const { error } = await supabaseAdmin.from('rider_verification_tokens').insert({
      user_id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const link = `${process.env.NEXT_PUBLIC_BASE_URL}/rider/verify-email?token=${rawToken}`;

    try {
      await sendVerificationEmail(email, full_name || rider.full_name || 'Rider', link);
    } catch (err) {
      console.error('Failed to send verification email:', err);
      return NextResponse.json({ error: 'Could not send verification email. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to send verification email.' }, { status: 500 });
  }
}