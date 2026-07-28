import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const { data: rider, error: findErr } = await supabaseAdmin
    .from('riders')
    .select('id, email_verified, verification_token_expires')
    .eq('verification_token_hash', tokenHash)
    .single();

  if (findErr || !rider) {
    return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 });
  }

  if (rider.email_verified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  if (new Date(rider.verification_token_expires) < new Date()) {
    return NextResponse.json({ error: 'This link has expired. Request a new one.' }, { status: 400 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from('riders')
    .update({ email_verified: true, verification_token_hash: null, verification_token_expires: null })
    .eq('id', rider.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}