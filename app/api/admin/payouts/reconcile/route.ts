import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { reconcilePayouts } from '@/lib/payoutSettle';

// POST — "Check stuck payments": asks Paystack about every payout still waiting and settles them.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('error' in auth) return auth.error;
  const result = await reconcilePayouts({ olderThanMinutes: 1 });
  return NextResponse.json(result);
}