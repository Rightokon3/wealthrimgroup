import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendOrderNotificationEmail } from '@/lib/email';
import { sendVendorNotificationEmail } from '@/lib/mailer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPushToUser } from '@/lib/web-push-server';
import { notifyAdmins } from '@/lib/notify-admins';

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
  picked_up:  'Your order has been picked up by the rider.',
  on_the_way: 'Your order is on the way! 🚴',
  delivered:  'Your order has been delivered. Enjoy! 🎉',
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
      await notifyNewOrder(body.orderId);
      return NextResponse.json({ success: true });
    }

    if (type === 'order_status') {
      if (!body.orderId || !body.status) {
        return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
      }
      await notifyOrderStatus(body.orderId, body.status);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
  } catch (err: any) {
    console.error('notify-vendor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function notifyNewOrder(orderId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      stores(
        name, email,
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

  // ── Admin broadcast: new order ───────────────────────────────────
  await notifyAdmins({
    type: 'new_order',
    title: 'New order placed',
    body: `${store?.name ?? 'A store'}: Order ${order.order_number} for ₦${order.total.toLocaleString()}.`,
    audience: 'admins_and_super',
    url: '/admin/orders',
  });
}

async function notifyOrderStatus(orderId: string, status: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_id')
    .eq('id', orderId)
    .single();

  if (!order?.customer_id) return;

  const title   = 'Order Update';
  const message = STATUS_MESSAGES[status] ?? `Your order ${order.order_number} status changed to ${status.replace(/_/g, ' ')}.`;

  await Promise.all([
    supabaseAdmin.from('notifications').insert({
      user_id: order.customer_id,
      type: 'order_status',
      title,
      body: `${order.order_number}: ${message}`,
      data: { order_id: order.id, status },
    }),
    sendPushToUser(order.customer_id, { title, body: message, url: '/orders' }),
  ]);
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