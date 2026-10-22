import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/places';
import { rateLimit, clientIp, tooMany } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wait = await rateLimit(`places:${clientIp(req)}`, 30, 60);
  if (wait) return tooMany(wait, 'Too many searches. Wait a moment.');

  const q = req.nextUrl.searchParams.get('q') ?? '';
  try {
    return NextResponse.json({ results: await searchCities(q) });
  } catch {
    // Map provider down / slow: the picker lets the person type their city instead.
    return NextResponse.json({ results: [], unavailable: true });
  }
}