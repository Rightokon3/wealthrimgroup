import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { notifyAdmins } from '@/lib/notify-admins';

// Customer says "I did not get this order". Earnings stay on hold until an admin looks at it.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;

  const { orderId, reason } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const { data: order } = await supabaseAdmin.from('orders')
    .select('id, order_number, customer_id, status, delivery_release_by').eq('id', orderId).single();
  if (!order || order.customer_id !== auth.user.id) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'delivered') return NextResponse.json({ error: 'This order is not marked delivered.' }, { status: 409 });
  if (order.delivery_release_by) return NextResponse.json({ error: 'This order was already completed.' }, { status: 409 });

  const text = (typeof reason === 'string' && reason.trim() ? reason.trim() : 'No reason given').slice(0, 500);
  await supabaseAdmin.from('orders')
    .update({ dispute_reported_at: new Date().toISOString(), dispute_reason: text }).eq('id', orderId);

  await notifyAdmins({
    type: 'delivery_dispute',
    title: 'Customer says order was not delivered',
    body: `Order ${order.order_number}: ${text}`,
    audience: 'admins_and_super',
    url: '/admin/orders',
  }).catch(() => {});

  return NextResponse.json({ success: true });
}