import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mailer';

// Accepts a number or numeric string, returns null for anything else
function toCoord(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function POST(req: NextRequest) {
  try {
    const {
      full_name, email, phone, password, city, state,
      latitude, longitude, vehicle_type, vehicle_plate,
    } = await req.json();

    if (!full_name || !email || !phone || !password || !city || !vehicle_type) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const lat = toCoord(latitude, -90, 90);
    const lng = toCoord(longitude, -180, 180);

    // 1. A real rider account already exists for this email — stop here,
    // this is a genuine "already registered" case.
    const { data: existingRider } = await supabaseAdmin
      .from('riders')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingRider) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try logging in instead.' },
        { status: 409 }
      );
    }

    // 2. An orphaned auth user from a previous broken RIDER signup (auth account
    // with no matching riders row)? Clear it out first so the email never
    // stays permanently stuck.
    // Safety: only auth users that were created as riders are removed. An account
    // with this email that belongs to a customer or vendor is never deleted.
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const orphan = userList?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (orphan) {
      if (orphan.user_metadata?.role === 'rider') {
        await supabaseAdmin.auth.admin.deleteUser(orphan.id);
      } else {
        return NextResponse.json(
          { error: 'This email is already used by another Drovo account. Use a different email for your rider account.' },
          { status: 409 }
        );
      }
    }

    // 3. Create the auth user server-side with the service role.
    // email_confirm: true — Supabase's own confirmation is skipped because
    // we run our own verification flow via riders.email_verified below.
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'rider' },
    });

    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message ?? 'Signup failed. Try again.' }, { status: 500 });
    }

    // 4. Insert the riders row with the SAME service-role client — this
    // cannot be silently blocked by RLS the way a client-side insert could.
    const { error: riderErr } = await supabaseAdmin.from('riders').insert({
      user_id: authData.user.id,
      full_name,
      email: normalizedEmail,
      phone,
      city: String(city).trim(),
      state: state ? String(state).trim() : null,
      latitude: lat,
      longitude: lng,
      vehicle_type,
      vehicle_plate: vehicle_plate || null,
      email_verified: false,
      is_active: true,
      total_deliveries: 0,
    });

    if (riderErr) {
      // Roll back the auth user we just created — awaited, not fire-and-forget,
      // so we never leave an orphan behind again.
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: riderErr.message }, { status: 500 });
    }

    // 5. Send our own verification email (separate from Supabase's).
    const { rawToken, tokenHash, expiresAt } = generateVerificationToken();
    const { error: tokenErr } = await supabaseAdmin.from('rider_verification_tokens').insert({
      user_id: authData.user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    if (!tokenErr) {
      const link = `${process.env.NEXT_PUBLIC_BASE_URL}/rider/verify-email?token=${rawToken}`;
      try {
        await sendVerificationEmail(normalizedEmail, full_name, link);
      } catch (err) {
        console.error('Verification email failed to send on signup:', err);
      }
    }

    return NextResponse.json({ success: true, user_id: authData.user.id, email: normalizedEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Signup failed.' }, { status: 500 });
  }
}