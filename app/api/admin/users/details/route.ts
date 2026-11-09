import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET ?id=<user id>  — everything about one user, for the admin "View" panel. Admins only.
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

  const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const prof: any = p;

  const { data: au } = await supabaseAdmin.auth.admin.getUserById(id);
  const a: any = au?.user ?? {};

  const out: any = {
    profile: {
      id: prof.id, full_name: prof.full_name ?? null, email: prof.email ?? a.email ?? null,
      phone: prof.phone ?? null, city: prof.city ?? null, country: prof.country ?? null,
      role: prof.role, created_at: prof.created_at ?? null,
      is_active: prof.is_active !== false,
      deactivated_at: prof.deactivated_at ?? null,
      deletion_requested_at: prof.deletion_requested_at ?? null,
    },
    auth: {
      email_confirmed_at: a.email_confirmed_at ?? null,
      last_sign_in_at: a.last_sign_in_at ?? null,
      created_at: a.created_at ?? null,
    },
  };

  const role = String(prof.role);

  if (role === 'rider') {
    const { data: r } = await supabaseAdmin.from('riders').select('*').eq('user_id', id).maybeSingle();
    const rr: any = r;
    if (rr) {
      const { count: delivered } = await supabaseAdmin
        .from('orders').select('id', { count: 'exact', head: true }).eq('rider_id', rr.id).eq('status', 'delivered');
      out.rider = {
        id: rr.id, full_name: rr.full_name ?? null, email: rr.email ?? null, phone: rr.phone ?? null,
        city: rr.city ?? null, state: rr.state ?? null,
        vehicle_type: rr.vehicle_type ?? null, vehicle_plate: rr.vehicle_plate ?? null,
        email_verified: !!rr.email_verified, is_active: rr.is_active !== false,
        total_deliveries: rr.total_deliveries ?? 0, delivered_orders: delivered ?? 0,
        emergency_contact_name: rr.emergency_contact_name ?? null,
        emergency_contact_phone: rr.emergency_contact_phone ?? null,
        max_pickup_km: rr.max_pickup_km ?? null,
        has_location: rr.latitude != null && rr.longitude != null,
        created_at: rr.created_at ?? null,
      };
    }
  }

  if (role === 'vendor') {
    const { data: st } = await supabaseAdmin.from('stores').select('*').eq('vendor_id', id).order('created_at', { ascending: true });
    const stores = ((st ?? []) as any[]).map(s => ({
      id: s.id, name: s.name ?? null, category: s.category ?? null, city: s.city ?? null,
      phone: s.phone ?? null, address: s.address ?? null,
      is_active: s.is_active !== false, is_verified: !!s.is_verified, rating: s.rating ?? null,
      created_at: s.created_at ?? null,
    }));
    out.stores = stores;
    const ids = stores.map(s => s.id);
    if (ids.length) {
      const [{ count: total }, { data: done }] = await Promise.all([
        supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).in('store_id', ids),
        supabaseAdmin.from('orders').select('total').in('store_id', ids).eq('status', 'delivered').limit(5000),
      ]);
      out.stats = {
        orders: total ?? 0,
        delivered: (done ?? []).length,
        revenue: ((done ?? []) as any[]).reduce((n, o) => n + Number(o.total ?? 0), 0),
      };
    } else {
      out.stats = { orders: 0, delivered: 0, revenue: 0 };
    }
  }

  if (role === 'customer') {
    const [{ data: addr }, { count: total }, { data: done }, { data: recent }] = await Promise.all([
      supabaseAdmin.from('saved_addresses').select('label, address, city, state, is_default').eq('user_id', id).limit(10),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', id),
      supabaseAdmin.from('orders').select('total').eq('customer_id', id).eq('status', 'delivered').limit(5000),
      supabaseAdmin.from('orders').select('id, status, total, created_at, stores(name)').eq('customer_id', id).order('created_at', { ascending: false }).limit(5),
    ]);
    out.addresses = addr ?? [];
    out.stats = {
      orders: total ?? 0,
      delivered: (done ?? []).length,
      spent: ((done ?? []) as any[]).reduce((n, o) => n + Number(o.total ?? 0), 0),
    };
    out.recentOrders = recent ?? [];
  }

  return NextResponse.json(out);
}