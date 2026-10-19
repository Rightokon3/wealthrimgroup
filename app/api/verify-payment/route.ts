import { NextResponse } from 'next/server';
import { settleCustomerPayment } from '@/lib/customerPayment';

/**
 * Responses:
 *  { verified: true,  ... }                    money received
 *  { verified: false, retry: true }            bad network / Paystack slow -> client should ask again
 *  { verified: false, retry: false, ... }      payment really failed / abandoned
 * Only a REAL failure is ever reported as failed. A timeout is never a failure.
 */
export async function POST(req: Request) {
  let reference = '';
  try { reference = String((await req.json())?.reference || '').trim(); } catch {}
  if (!reference || reference.length > 100) {
    return NextResponse.json({ verified: false, retry: false, error: 'Missing reference' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ verified: false, retry: true, error: 'Network is slow. Checking again…' });
  }

  let json: any = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || !json) {
    // 404 = Paystack has no such transaction (yet). 5xx/other = try again.
    const notFound = res.status === 404;
    return NextResponse.json({ verified: false, retry: !notFound, error: json?.message || 'Could not confirm yet' });
  }

  const d = json.data;
  if (d?.status === 'success') {
    const amountNaira = Number(d.amount) / 100;
    const settle = await settleCustomerPayment(reference, amountNaira);
    if (settle.result === 'underpaid') {
      return NextResponse.json({
        verified: false, retry: false, underpaid: true,
        error: 'The amount paid is less than the order total. Please contact support with your reference.',
        reference,
      });
    }
    return NextResponse.json({
      verified: true, amountKobo: d.amount, amountNaira, reference,
      channel: d.channel, paidAt: d.paid_at, order: settle.result,
    });
  }
  // ongoing / pending / processing -> keep waiting; abandoned/failed -> stop
  const waiting = ['ongoing', 'pending', 'processing', 'queued'].includes(d?.status);
  return NextResponse.json({ verified: false, retry: waiting, status: d?.status, error: d?.gateway_response || 'Payment not completed' });
}