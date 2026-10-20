import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';

export const dynamic = 'force-dynamic';

const VEHICLES = ['motorcycle', 'bicycle', 'car'];
const COLS = 'id, full_name, phone, city, vehicle_type, vehicle_plate, max_pickup_km, notify_new_orders, emergency_contact_name, emergency_contact_phone';

async function getRider(userId: string) {
  const { data } = await supabaseAdmin.from('riders').select(COLS).eq('user_id', userId).maybeSingle();
  return data as any;
}

// GET — the signed-in rider's settings
export async function GET(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const rider = await getRider(auth.user.id);
  if (!rider) return NextResponse.json({ error: 'Not a rider.' }, { status: 403 });
  return NextResponse.json({ rider, email: auth.user.email });
}

// POST — save settings. Only the fields below can be changed; status and verification never can.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  const rider = await getRider(auth.user.id);
  if (!rider) return NextResponse.json({ error: 'Not a rider.' }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};
  const phoneOk = (p: string) => /^\+?[0-9\s-]{7,16}$/.test(p);
  const clean = (v: any, max: number) => String(v).trim().slice(0, max);

  if ('full_name' in b) {
    const v = clean(b.full_name, 80);
    if (v.length < 2) return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 });
    update.full_name = v;
  }
  if ('phone' in b) {
    const v = clean(b.phone, 20);
    if (!phoneOk(v)) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    update.phone = v;
  }
  if ('city' in b) {
    const c = clean(b.city, 60);
    if (c.length < 2) return NextResponse.json({ error: 'Please search for and choose your city.' }, { status: 400 });
    update.city = c;
  }
  if ('vehicle_type' in b) {
    if (!VEHICLES.includes(b.vehicle_type)) return NextResponse.json({ error: 'Choose a vehicle.' }, { status: 400 });
    update.vehicle_type = b.vehicle_type;
  }
  if ('vehicle_plate' in b) update.vehicle_plate = clean(b.vehicle_plate, 15).toUpperCase() || null;
  if ('max_pickup_km' in b) {
    const km = Math.round(Number(b.max_pickup_km));
    if (!Number.isFinite(km) || km < 1 || km > 50) return NextResponse.json({ error: 'Distance must be between 1 and 50 km.' }, { status: 400 });
    update.max_pickup_km = km;
  }
  if ('notify_new_orders' in b) update.notify_new_orders = !!b.notify_new_orders;
  if ('emergency_contact_name' in b) update.emergency_contact_name = clean(b.emergency_contact_name, 80) || null;
  if ('emergency_contact_phone' in b) {
    const v = clean(b.emergency_contact_phone, 20);
    if (v && !phoneOk(v)) return NextResponse.json({ error: 'Enter a valid emergency contact number.' }, { status: 400 });
    update.emergency_contact_phone = v || null;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('riders').update(update).eq('id', rider.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // keep the general profile in step with the rider profile
  const p: Record<string, any> = {};
  if (update.full_name) p.full_name = update.full_name;
  if (update.phone) p.phone = update.phone;
  if ('city' in update) p.city = update.city;
  if (Object.keys(p).length) await supabaseAdmin.from('profiles').update(p).eq('id', auth.user.id);

  return NextResponse.json({ success: true });
}
