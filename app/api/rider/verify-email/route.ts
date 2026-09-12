import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const { data: tokenRow, error: findErr } = await supabaseAdmin
    .from('rider_verification_tokens')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (findErr || !tokenRow) {
    return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired. Request a new one.' }, { status: 400 });
  }

  const { data: rider, error: riderErr } = await supabaseAdmin
    .from('riders')
    .select('id, email_verified')
    .eq('user_id', tokenRow.user_id)
    .single();

  if (riderErr || !rider) {
    return NextResponse.json({ error: 'Rider account not found.' }, { status: 400 });
  }

  if (!rider.email_verified) {
    const { error: updateErr } = await supabaseAdmin
      .from('riders')
      .update({ email_verified: true })
      .eq('id', rider.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  // Clean up all outstanding tokens for this user — verified now, no need
  // for any other pending emails' links to keep working.
  await supabaseAdmin
    .from('rider_verification_tokens')
    .delete()
    .eq('user_id', tokenRow.user_id);

  return NextResponse.json({ success: true, alreadyVerified: rider.email_verified });
}