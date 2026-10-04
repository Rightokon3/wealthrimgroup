import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Use at the top of any API route that acts on behalf of a customer.
// The browser must send:  Authorization: Bearer <session.access_token>
//
//   const auth = await requireVerifiedUser(req);
//   if ('error' in auth) return auth.error;
//   const user = auth.user;   // verified, real user
export async function requireVerifiedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };
  }

  // Asks Supabase to validate the token itself, so a forged token cannot pass
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }) };
  }

  if (!data.user.email_confirmed_at) {
    return { error: NextResponse.json({ error: 'Please verify your email first.' }, { status: 403 }) };
  }

  return { user: data.user };
}