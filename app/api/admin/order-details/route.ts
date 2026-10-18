import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET ?id=<order id>  — everything about one order, for the admin "Details" window. Admins only.
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  const { data: u } = await supabaseAdmin.auth.getUser(token);
  if (!u?.user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  const { data: me } = await supabaseAdmin.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
  if (!me || !['admin', 'super_admin'].includes(String((me as any).role))) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, stores(name, category, phone, city), order_items(*)')
    .eq('id', id).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const o: any = order;

  // Customer
  const { data: cust } = o.customer_id
    ? await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', o.customer_id).maybeSingle()
    : { data: null };
  let customerEmail: string | null = null;
  if (o.customer_id) {
    const { data: au } = await supabaseAdmin.auth.admin.getUserById(o.customer_id);
    customerEmail = au?.user?.email ?? null;
  }

  // Riders: the one doing the delivery, the one the customer picked, and every rider who cancelled
  const declined: string[] = Array.isArray(o.declined_rider_ids) ? o.declined_rider_ids : [];
  const riderIds = Array.from(new Set([o.rider_id, o.assigned_rider_id, ...declined].filter(Boolean)));
  const { data: riderRows } = riderIds.length
    ? await supabaseAdmin.from('riders').select('*').in('id', riderIds)
    : { data: [] as any[] };
  const pick = (r: any) => r && ({
    id: r.id, name: r.full_name ?? null, phone: r.phone ?? null, email: r.email ?? null,
    vehicle: r.vehicle_type ?? null, plate: r.vehicle_plate ?? null, city: r.city ?? null,
    emergency: r.emergency_contact_phone ? `${r.emergency_contact_name ?? 'Contact'} · ${r.emergency_contact_phone}` : null,
  });
  const byId = new Map(((riderRows ?? []) as any[]).map(r => [r.id, r]));

  return NextResponse.json({
    order: o,
    customer: { name: (cust as any)?.full_name ?? null, phone: (cust as any)?.phone ?? o.customer_phone ?? null, email: customerEmail },
    deliveryRider: pick(byId.get(o.rider_id)),
    chosenRider: pick(byId.get(o.assigned_rider_id)),
    cancelledRiders: declined.map(rid => pick(byId.get(rid)) ?? { id: rid, name: 'Unknown rider' }),
  });
}