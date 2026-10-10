import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireVerifiedUser';
import { listBanks } from '@/lib/paystackPayouts';

let cache: { at: number; banks: { name: string; code: string }[] } | null = null;

export async function GET(req: NextRequest) {
  const auth = await requireVerifiedUser(req);
  if ('error' in auth) return auth.error;
  try {
    if (!cache || Date.now() - cache.at > 6 * 3600_000) cache = { at: Date.now(), banks: await listBanks() };
    return NextResponse.json({ banks: cache.banks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Could not load banks' }, { status: 502 });
  }
}