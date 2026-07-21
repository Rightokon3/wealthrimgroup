import { NextRequest, NextResponse } from 'next/server';

// This route runs server-side only, so PAYSTACK_SECRET_KEY never reaches the browser.
export async function POST(req: NextRequest) {
  const { reference } = await req.json();

  if (!reference) {
    return NextResponse.json({ verified: false, message: 'Missing transaction reference' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await res.json();

    if (!res.ok || !data.status || data.data?.status !== 'success') {
      return NextResponse.json({ verified: false, message: data.message ?? 'Payment not successful' }, { status: 400 });
    }

    return NextResponse.json({
      verified: true,
      amountKobo: data.data.amount,      // Paystack amounts are in kobo
      amountNaira: data.data.amount / 100,
      reference: data.data.reference,
      channel: data.data.channel,
      paidAt: data.data.paid_at,
    });
  } catch (e: any) {
    return NextResponse.json({ verified: false, message: e.message ?? 'Verification request failed' }, { status: 500 });
  }
}