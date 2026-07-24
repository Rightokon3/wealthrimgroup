import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { profileId, email, firstName, lastName, phone } = await req.json();

  if (!profileId || !email) {
    return NextResponse.json({ error: 'Missing profileId or email' }, { status: 400 });
  }

  try {
    // Already has one — just return it.
    const { data: existing } = await supabaseAdmin
      .from('customer_virtual_accounts')
      .select('account_number, account_name, bank_name')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        accountNumber: existing.account_number,
        accountName:   existing.account_name,
        bankName:      existing.bank_name,
      });
    }

    // 1. Create a Paystack customer
    const custRes = await fetch('https://api.paystack.co/customer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: firstName ?? '',
        last_name:  lastName ?? '',
        phone:      phone ?? '',
      }),
    });
    const custData = await custRes.json();
    if (!custData.status) {
      throw new Error(custData.message ?? 'Failed to create Paystack customer');
    }
    const customerCode = custData.data.customer_code;

    // 2. Create a dedicated virtual account for that customer
    const dvaRes = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer: customerCode, preferred_bank: 'wema-bank' }),
    });
    const dvaData = await dvaRes.json();
    if (!dvaData.status) {
      throw new Error(
        dvaData.message ?? 'Failed to create virtual account. Has Dedicated NUBAN been enabled on your Paystack account?'
      );
    }

    const accountNumber = dvaData.data.account_number;
    const accountName   = dvaData.data.account_name;
    const bankName       = dvaData.data.bank.name;

    await supabaseAdmin.from('customer_virtual_accounts').insert([{
      profile_id: profileId,
      paystack_customer_code: customerCode,
      account_number: accountNumber,
      account_name: accountName,
      bank_name: bankName,
    }]);

    return NextResponse.json({ accountNumber, accountName, bankName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to set up virtual account' }, { status: 500 });
  }
}