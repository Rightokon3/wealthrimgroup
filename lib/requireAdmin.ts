import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Use at the top of every admin-only API route.   Browser sends: Authorization: Bearer <access_token>
//
//   const auth = await requireAdmin(req);
//   if ('error' in auth) return auth.error;
//   const admin = auth.user;
//
// A caller must pass THREE separate checks:
//   1. a real, verified Supabase session (the token is validated by Supabase itself)
//   2. profiles.role is an admin role in the database
//   3. their email is on PAYOUT_ADMIN_EMAILS (set on your server; the browser can never change it)
// Check 3 means that even if someone somehow got an "admin" role in the database,
// they still could not move money.
const ADMIN_ROLES = ['admin', 'super_admin'];

export async function requireAdmin(req: NextRequest) {
  const forbidden = () => ({ error: NextResponse.json({ error: 'Not allowed.' }, { status: 403 }) });

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ error: 'Please log in.' }, { status: 401 }) };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { error: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }) };
  if (!user.email_confirmed_at || !user.email) return forbidden();

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !ADMIN_ROLES.includes(String((profile as any).role))) return forbidden();

  const allowed = (process.env.PAYOUT_ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0 || !allowed.includes(user.email.toLowerCase())) return forbidden();

  return { user };
}