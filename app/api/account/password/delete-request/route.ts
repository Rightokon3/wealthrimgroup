import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { notifyAdmins } from '@/lib/notify-admins';

// POST { action: 'request' | 'cancel', confirm?: 'DELETE' }
// Account deletion is a request that an admin completes, because orders, refunds and wallet money
// must be settled first. Customers can cancel the request any time before then.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const user = auth.user;
  const { action, confirm } = await req.json().catch(() => ({}));

  if (action === 'cancel') {
    await supabaseAdmin.from('profiles').update({ deletion_requested_at: null }).eq('id', user.id);
    return NextResponse.json({ success: true });
  }
  if (action !== 'request') return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  if (confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });

  // Orders still in progress must finish (or be cancelled) first
  const { count } = await supabaseAdmin.from('orders').select('id', { count: 'exact', head: true })
    .eq('customer_id', user.id)
    .not('status', 'in', '(delivered,cancelled,refunded)');
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'You still have an order in progress. Wait for it to arrive, or cancel it, then try again.' }, { status: 400 });
  }

  await supabaseAdmin.from('profiles').update({ deletion_requested_at: new Date().toISOString() }).eq('id', user.id);
  await notifyAdmins({
    type: 'account_deletion',
    title: 'Account deletion requested',
    body: `${user.email} asked to delete their account.`,
    audience: 'admins_and_super',
    url: '/admin/users',
  }).catch(() => {});
  return NextResponse.json({ success: true });
}