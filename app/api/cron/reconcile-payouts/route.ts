import { NextRequest, NextResponse } from 'next/server';
import { reconcilePayouts } from '@/lib/payoutSettle';

// GET with  Authorization: Bearer <CRON_SECRET>  — set this up on cron-job.org every 5 minutes.
// It settles any payout that got stuck because of a network problem.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  }
  return NextResponse.json(await reconcilePayouts({ olderThanMinutes: 2, limit: 50 }));
}