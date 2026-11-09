import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';
import { rateLimit, tooMany } from '@/lib/rateLimit';

// POST { userId, active }  — deactivate (active:false) or reactivate (active:true) a customer, vendor or rider.
// Admin accounts can never be deactivated here, and an admin cannot deactivate themselves.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;
  const admin = auth.user;

  const wait = await rateLimit(`admin-user-status:${admin.id}`, 60, 60);
  if (wait) return tooMany(wait, 'Too many changes. Wait a moment.');

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? '');
  const active = body.active === true;
  if (!/^[0-9a-f-]{36}$/i.test(userId) || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  if (userId === admin.id) return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });

  const { data: target } = await supabaseAdmin.from('profiles').select('id, role').eq('id', userId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const role = String((target as any).role);
  if (role === 'admin' || role === 'super_admin') {
    return NextResponse.json({ error: 'Admin accounts cannot be deactivated.' }, { status: 403 });
  }
  if (!['customer', 'vendor', 'rider'].includes(role)) {
    return NextResponse.json({ error: 'This account type cannot be changed here.' }, { status: 400 });
  }

  // 1) Block / unblock signing in (a ban lasts ~100 years until lifted)
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' });
  if (banErr) return NextResponse.json({ error: banErr.message }, { status: 500 });

  // 2) Record it on the profile
  const { error: pErr } = await supabaseAdmin.from('profiles').update(
    active
      ? { is_active: true, deactivated_at: null, deactivated_by: null }
      : { is_active: false, deactivated_at: new Date().toISOString(), deactivated_by: admin.id },
  ).eq('id', userId);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // 3) Role-specific: hide / show a vendor's shop, stop / allow a rider taking jobs
  if (role === 'vendor') await supabaseAdmin.from('stores').update({ is_active: active }).eq('vendor_id', userId);
  if (role === 'rider') await supabaseAdmin.from('riders').update({ is_active: active }).eq('user_id', userId);

  // 4) Sign them out everywhere
  if (!active) await supabaseAdmin.rpc('revoke_user_sessions', { p_user: userId });

  return NextResponse.json({ success: true, active });
}