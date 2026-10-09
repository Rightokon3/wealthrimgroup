import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPushToUser } from '@/lib/web-push-server';
import { notifyAdmins } from '@/lib/notify-admins';
import { isNearby } from '@/lib/riderMatch';

// POST /api/orders/rider-released   { orderId }
// Called by the rider's app right after the rider cancels (rider_release_order).
// Tells the customer + vendor, and re-alerts nearby riders (not the one who cancelled).

const RADIUS_KM = 25;

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: au } = token ? await supabaseAdmin.auth.getUser(token) : { data: null as any };
    const user = au?.user;
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const { data: rider } = await supabaseAdmin.from('riders').select('id').eq('user_id', user.id).maybeSingle();
    if (!rider) return NextResponse.json({ error: 'Not a rider' }, { status: 403 });

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, stores(name, city, latitude, longitude, vendor_id)')
      .eq('id', orderId)
      .single();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Only the rider who actually released it, and only once per release.
    const declined: string[] = order.declined_rider_ids ?? [];
    if (!declined.includes(rider.id) || !order.rider_released_at || order.rider_id) {
      return NextResponse.json({ error: 'Nothing to announce' }, { status: 409 });
    }
    const { data: claimed } = await supabaseAdmin
      .from('orders')
      .update({ rider_release_notified_at: new Date().toISOString() })
      .eq('id', orderId)
      .or(`rider_release_notified_at.is.null,rider_release_notified_at.lt.${order.rider_released_at}`)
      .select('id')
      .maybeSingle();
    if (!claimed) return NextResponse.json({ success: true, alreadyNotified: true });

    const store = order.stores as any;

    // 1) Customer: honest message, no panic.
    const cTitle = 'Your rider had to cancel';
    const cBody = `Don't worry, your order ${order.order_number} is still on. We're finding you a new rider right now.`;
    await Promise.allSettled([
      supabaseAdmin.from('notifications').insert({ user_id: order.customer_id, type: 'rider_cancelled', title: cTitle, body: cBody }),
      sendPushToUser(order.customer_id, { title: cTitle, body: cBody, url: '/orders' }),
    ]);

    // 2) Vendor: heads-up.
    if (store?.vendor_id) {
      const vBody = `The rider for order ${order.order_number} cancelled. We're finding another rider.`;
      await Promise.allSettled([
        supabaseAdmin.from('notifications').insert({ user_id: store.vendor_id, type: 'rider_cancelled', title: 'Rider cancelled', body: vBody }),
        sendPushToUser(store.vendor_id, { title: 'Rider cancelled', body: vBody, url: '/vendor/dashboard' }),
      ]);
    }

    // 3) Nearby online riders, except everyone who already cancelled this order.
    const { data: riders } = await supabaseAdmin
      .from('riders')
      .select('id, user_id, city, latitude, longitude')
      .eq('is_online', true)
      .eq('is_active', true);
    const targets = (riders ?? []).filter((r: any) =>
      r.user_id && !declined.includes(r.id) && isNearby(r, store, RADIUS_KM));

    if (targets.length) {
      const fee = Number(order.delivery_fee ?? 0);
      const title = 'Delivery available 🚴';
      const body = `${store?.name ?? 'A store'}${store?.city ? ` (${store.city})` : ''} → ${order.delivery_city ?? 'customer'}. Order ${order.order_number}${fee > 0 ? `, delivery fee ₦${fee.toLocaleString()}` : ''}.`;
      await supabaseAdmin.from('notifications').insert(
        targets.map((r: any) => ({ user_id: r.user_id, type: 'new_delivery', title, body, data: { order_id: order.id } })));
      await Promise.allSettled(targets.map((r: any) => sendPushToUser(r.user_id, { title, body, url: '/rider/dashboard' })));
    }

    // 4) Admins: the order is struggling.
    if ((order.rider_release_count ?? 0) >= 2 || targets.length === 0) {
      await notifyAdmins({
        type: 'rider_cancelled',
        title: 'Order needs a rider',
        body: `Order ${order.order_number}: ${order.rider_release_count ?? 1} rider cancellation(s), ${targets.length} rider(s) alerted.`,
        audience: 'admins_and_super',
        url: '/admin/orders',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, ridersAlerted: targets.length });
  } catch (err: any) {
    console.error('rider-released error:', err);
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}