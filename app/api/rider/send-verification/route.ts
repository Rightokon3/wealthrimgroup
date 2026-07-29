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

  const { error } = await supabaseAdmin
    .from('riders')
    .update({
      verification_token_hash: tokenHash,
      verification_token_expires: expiresAt.toISOString(),
    })
    .eq('user_id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const link = `${process.env.NEXT_PUBLIC_BASE_URL}/rider/verify-email?token=${rawToken}`;

  // Don't block the response on Gmail — send in the background.
  sendVerificationEmail(email, full_name || 'Rider', link).catch(err => {
    console.error('Failed to send verification email:', err);
  });

  return NextResponse.json({ success: true });
}