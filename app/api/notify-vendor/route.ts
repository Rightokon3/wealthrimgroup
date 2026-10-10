import { NextRequest, NextResponse } from 'next/server';
import { sendOrderNotificationEmail } from '@/lib/email';
import { sendVendorNotificationEmail, sendOrderConfirmationEmail, sendOrderStatusEmail, hasStatusEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPushToUser } from '@/lib/web-push-server';
import { notifyAdmins } from '@/lib/notify-admins';
import { isNearby } from '@/lib/riderMatch';
import { getBaseUrl } from '@/lib/getBaseUrl';

// Where a rider lands when they tap a new-order notification. Change if yours differs.
const RIDER_DASHBOARD_URL = '/rider/dashboard';
// Riders within this distance of the vendor (or in the same city) get the alert.
const RIDER_RADIUS_KM = 25;

type Body = {
  orderId?: string;
  vendorId?: string;
  status?: string;
  type?: 'welcome' | 'new_order' | 'order_status';
};

const STATUS_MESSAGES: Record<string, string> = {
  confirmed:  'Your order has been confirmed by the vendor.',
  preparing:  'Your order is being prepared.',
  ready:      'Your order is ready.',
  picked_up:  'Your order has been picked up by the rider. Tap to track it live.',
  on_the_way: 'Your order has been sent out for delivery! 🚴 Would you like to track it? Tap to follow your rider live.',
  delivered:  'Your order was marked delivered. Did you get it? Tap "I received it" on your orders page so your rider gets paid.',
  cancelled:  'Your order has been cancelled.',
  refunded:   'Your order has been refunded.',
};

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const type = body.type ?? (body.orderId && body.status ? 'order_status' : body.orderId ? 'new_order' : null);

    if (type === 'welcome') {
      if (!body.vendorId) return NextResponse.json({ error: 'vendorId required' }, { status: 400 });
      await notifyWelcome(body.vendorId);
      return NextResponse.json({ success: true });
    }

    if (type === 'new_order') {
      if (!body.orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
      await notifyNewOrder(body.orderId, getBaseUrl(req));
      return NextResponse.json({ success: true });
    }

    if (type === 'order_status') {
      if (!body.orderId || !body.status) {
        return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
      }
      await notifyOrderStatus(body.orderId, body.status, getBaseUrl(req));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
  } catch (err: any) {
    console.error('notify-vendor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function notifyNewOrder(orderId: string, baseUrl: string) {
  // Use the admin client (service role — bypasses RLS) to read the order
  // plus its store/vendor/customer details. This is a backend notification
  // job, not an action taken on behalf of the calling customer, and the
  // previous cookie-scoped client couldn't complete this query: embedding
  // profiles:vendor_id(...) tries to read another user's profile row,
  // which typical "select own profile only" RLS policies block. Supabase
  // fails the *whole* select when an embedded join is denied, so this
  // function was throwing on every single new order and failing silently
  // (the checkout page only console.warns on failure).
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items(*),
      stores(
        name, email,
        city, address, latitude, longitude,
        vendor_id,
        profiles:vendor_id(full_name, email)
      ),
      profiles:customer_id(full_name, phone)
    `)
    .eq('id', orderId)
    .single();

  if (orderErr || !order) throw new Error('Order not found');

  const store         = order.stores as any;
  const vendorProfile = store?.profiles as any;
  const customer      = order.profiles as any;
  const vendorId      = store?.vendor_id;
  const vendorEmail   = store?.email || vendorProfile?.email;

  // ── Vendor: rich order email (unchanged) ────────────────────────
  if (vendorEmail) {
    await sendOrderNotificationEmail({
      vendorEmail,
      vendorName:      vendorProfile?.full_name ?? 'Vendor',
      storeName:       store?.name ?? 'Your Store',
      orderNumber:     order.order_number,
      orderId:         order.id,
      customerName:    customer?.full_name ?? 'Customer',
      customerPhone:   order.customer_phone,
      deliveryAddress: order.delivery_address ?? '',
      deliveryCity:    order.delivery_city ?? '',
      deliveryNote:    order.delivery_note,
      items: (order.order_items ?? []).map((i: any) => ({
        name: i.name, quantity: i.quantity, price: i.price, subtotal: i.subtotal,
      })),
      subtotal:      order.subtotal,
      deliveryFee:   order.delivery_fee,
      platformFee:   order.platform_fee,
      vendorPayout:  order.vendor_payout,
      total:         order.total,
      paymentMethod: order.payment_method,
      deliveryType:  order.delivery_type,
    });
  }

  // ── Vendor: in-app + push ────────────────────────────────────────
  if (vendorId) {
    const vTitle   = 'New Order Received 🛍️';
    const vMessage = `${store?.name ?? 'Your store'}: Order ${order.order_number} for ₦${order.total.toLocaleString()} just came in.`;

    await Promise.all([
      supabaseAdmin.from('notifications').insert({
        user_id: vendorId, type: 'new_order', title: vTitle, body: vMessage, data: { order_id: order.id },
      }),
      sendPushToUser(vendorId, { title: vTitle, body: vMessage, url: '/vendor/dashboard' }),
    ]);
  }

  // ── Customer: "order placed" in-app + push ──────────────────────
  if (order.customer_id) {
    const cTitle   = 'Order placed! 🎉';
    const cMessage = `Your order ${order.order_number} has been sent to ${store?.name ?? 'the vendor'}.`;

    await Promise.all([
      supabaseAdmin.from('notifications').insert({
        user_id: order.customer_id, type: 'order_placed', title: cTitle, body: cMessage, data: { order_id: order.id },
      }),
      sendPushToUser(order.customer_id, { title: cTitle, body: cMessage, url: '/orders' }),
    ]);
  }

  // ── Customer: order confirmation email ───────────────────────────
  if (order.customer_id) {
    try {
      const { data: cu } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
      const customerEmail = cu?.user?.email;
      if (customerEmail) {
        await sendOrderConfirmationEmail(
          customerEmail,
          customer?.full_name ?? 'there',
          {
            orderNumber:     order.order_number,
            storeName:       store?.name ?? 'the vendor',
            items:           (order.order_items ?? []).map((i: any) => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
            subtotal:        order.subtotal,
            deliveryFee:     order.delivery_fee ?? 0,
            total:           order.total,
            paymentMethod:   order.payment_method,
            deliveryType:    order.delivery_type,
            deliveryAddress: order.delivery_address,
            deliveryCity:    order.delivery_city,
          },
          `${baseUrl}/orders`
        );
      }
    } catch (err) {
      console.error('Customer confirmation email failed:', err);
    }
  }

  // ── Riders: alert nearby online riders ───────────────────────────
  // Wrapped so a rider-notification problem can never break the vendor,
  // customer or admin notifications above and below.
  try {
    await notifyNearbyRiders(order, store);
  } catch (err) {
    console.error('Rider notification failed:', err);
  }

  // ── Admin broadcast: new order ───────────────────────────────────
  await notifyAdmins({
    type: 'new_order',
    title: 'New order placed',
    body: `${store?.name ?? 'A store'}: Order ${order.order_number} for ₦${order.total.toLocaleString()}.`,
    audience: 'admins_and_super',
    url: '/admin/orders',
  });
}

/**
 * Delivery orders only (viewings have no rider).
 *  - If the customer picked a rider at checkout and that rider is still online,
 *    only that rider is alerted.
 *  - Otherwise every online, active rider within RIDER_RADIUS_KM of the vendor,
 *    or in the vendor's city, is alerted.
 */
async function notifyNearbyRiders(order: any, store: any) {
  if (!store || order.delivery_type !== 'delivery') return;

  const { data: riders, error } = await supabaseAdmin
    .from('riders')
    .select('id, user_id, city, latitude, longitude')
    .eq('is_online', true)
    .eq('is_active', true);

  if (error || !riders?.length) return;

  const chosen = order.assigned_rider_id
    ? riders.find((r: any) => r.id === order.assigned_rider_id)
    : null;

  const targets = chosen
    ? [chosen]
    : riders.filter((r: any) => isNearby(r, store, RIDER_RADIUS_KM));

  const recipients = targets.filter((r: any) => r.user_id);
  if (recipients.length === 0) return;

  const fee   = Number(order.delivery_fee ?? 0);
  const title = chosen ? 'New delivery request 🚴' : 'New order nearby 🚴';
  const message =
    `${store.name}${store.city ? ` (${store.city})` : ''} → ${order.delivery_city ?? 'customer'}. ` +
    `Order ${order.order_number}${fee > 0 ? `, delivery fee ₦${fee.toLocaleString()}` : ''}.`;

  await supabaseAdmin.from('notifications').insert(
    recipients.map((r: any) => ({
      user_id: r.user_id,
      type:    'new_delivery',
      title,
      body:    message,
      data:    { order_id: order.id },
    }))
  );

  await Promise.allSettled(
    recipients.map((r: any) =>
      sendPushToUser(r.user_id, { title, body: message, url: RIDER_DASHBOARD_URL })
    )
  );
}

async function notifyOrderStatus(orderId: string, status: string, baseUrl: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_id, rider_id, stores(name)')
    .eq('id', orderId)
    .single();

  if (!order?.customer_id) return;

  const trackable = status === 'picked_up' || status === 'on_the_way';
  const trackUrl  = trackable ? `/orders/${order.id}/track` : '/orders';
  const title   = status === 'on_the_way' ? 'Your order is on the way 🚴' : 'Order Update';
  const message = STATUS_MESSAGES[status] ?? `Your order ${order.order_number} status changed to ${status.replace(/_/g, ' ')}.`;

  await Promise.all([
    supabaseAdmin.from('notifications').insert({
      user_id: order.customer_id,
      type: 'order_status',
      title,
      body: `${order.order_number}: ${message}`,
      data: { order_id: order.id, status, url: trackUrl },
    }),
    sendPushToUser(order.customer_id, { title, body: message, url: trackUrl }),
  ]);

  // ── Customer: status update email (every change) ────────────────────
  // Wrapped so an email problem never blocks the in-app / push notification above.
  if (hasStatusEmail(status)) {
    try {
      const [{ data: cu }, { data: cp }] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(order.customer_id),
        supabaseAdmin.from('profiles').select('full_name').eq('id', order.customer_id).maybeSingle(),
      ]);
      const customerEmail = cu?.user?.email;
      if (customerEmail) {
        await sendOrderStatusEmail(
          customerEmail,
          cp?.full_name ?? 'there',
          { orderNumber: order.order_number, storeName: (order as any).stores?.name ?? 'the vendor', status },
          `${baseUrl}${trackUrl}`,
          trackable ? 'Track my delivery' : 'View my order',
        );
      }
    } catch (err) {
      console.error('Customer status email failed:', err);
    }
  }

  // The assigned rider should know the moment the order is ready to collect
  const riderId = (order as any).rider_id;
  if (status === 'ready' && riderId) {
    try {
      const { data: rider } = await supabaseAdmin
        .from('riders').select('user_id').eq('id', riderId).maybeSingle();
      if (rider?.user_id) {
        const rTitle   = 'Order ready for pickup 📦';
        const rMessage = `${(order as any).stores?.name ?? 'The vendor'}: Order ${order.order_number} is ready. Head over to pick it up.`;
        await Promise.all([
          supabaseAdmin.from('notifications').insert({
            user_id: rider.user_id, type: 'order_ready', title: rTitle, body: rMessage, data: { order_id: order.id },
          }),
          sendPushToUser(rider.user_id, { title: rTitle, body: rMessage, url: `/rider/orders/${order.id}` }),
        ]);
      }
    } catch (err) {
      console.error('Rider ready notification failed:', err);
    }
  }
}

async function notifyWelcome(vendorId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', vendorId)
    .single();

  if (!profile) return;

  const title   = 'Welcome to Drovo! 🎉';
  const message = `Hi ${profile.full_name ?? 'there'}, your vendor account is live. Set up your store and start selling on Drovo today.`;

  await Promise.all([
    supabaseAdmin.from('notifications').insert({ user_id: vendorId, type: 'welcome', title, body: message }),
    profile.email ? sendVendorNotificationEmail(profile.email, title, message) : Promise.resolve(),
    sendPushToUser(vendorId, { title, body: message, url: '/vendor/dashboard' }),
  ]);
}