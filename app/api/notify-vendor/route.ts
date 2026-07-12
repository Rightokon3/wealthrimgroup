import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendOrderNotificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

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

    // Fetch full order with store + vendor + items
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

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const store        = order.stores as any;
    const vendorProfile = store?.profiles as any;
    const customer     = order.profiles as any;

    // Use store email first, fall back to vendor profile email
    const vendorEmail = store?.email || vendorProfile?.email;
    if (!vendorEmail) {
      return NextResponse.json({ error: 'No vendor email found' }, { status: 400 });
    }

    await sendOrderNotificationEmail({
      vendorEmail,
      vendorName:      vendorProfile?.full_name ?? 'Vendor',
      storeName:       store?.name ?? 'Your Store',
      orderNumber:     order.order_number,
      orderId:         order.id,
      customerName:    customer?.full_name ?? order.profiles?.full_name ?? 'Customer',
      customerPhone:   order.customer_phone,
      deliveryAddress: order.delivery_address ?? '',
      deliveryCity:    order.delivery_city ?? '',
      deliveryNote:    order.delivery_note,
      items: (order.order_items ?? []).map((i: any) => ({
        name:     i.name,
        quantity: i.quantity,
        price:    i.price,
        subtotal: i.subtotal,
      })),
      subtotal:      order.subtotal,
      deliveryFee:   order.delivery_fee,
      platformFee:   order.platform_fee,
      vendorPayout:  order.vendor_payout,
      total:         order.total,
      paymentMethod: order.payment_method,
      deliveryType:  order.delivery_type,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('notify-vendor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}