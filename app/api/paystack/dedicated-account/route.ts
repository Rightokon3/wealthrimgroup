import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateDedicatedAccount } from '@/lib/paystack';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization'); // "Bearer <access_token>"
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // A short-lived client scoped to this request's token — validates it
  // against Supabase without needing cookies.
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, phone, paystack_customer_code')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  try {
    const [firstName, ...rest] = (profile.full_name ?? 'Customer').split(' ');
    const account = await getOrCreateDedicatedAccount({
      email: profile.email,
      firstName: firstName || 'Customer',
      lastName: rest.join(' ') || 'Customer',
      phone: profile.phone ?? '',
      existingPaystackCustomerCode: profile.paystack_customer_code,
    });

    if (!profile.paystack_customer_code) {
      await supabase
        .from('profiles')
        .update({ paystack_customer_code: account.customerCode })
        .eq('id', user.id);
    }

    return NextResponse.json({
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to get transfer account' }, { status: 500 });
  }
}