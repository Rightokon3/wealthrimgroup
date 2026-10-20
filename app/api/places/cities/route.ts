import { NextRequest, NextResponse } from 'next/server';
import { searchCities } from '@/lib/places';

export const dynamic = 'force-dynamic';

// Light per-IP limit so nobody can use this endpoint to hammer the map provider.
const hits = new Map<string, { n: number; reset: number }>();

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) hits.set(ip, { n: 1, reset: now + 60_000 });
  else if (++h.n > 40) return NextResponse.json({ error: 'Too many searches. Wait a minute.' }, { status: 429 });
  if (hits.size > 2000) hits.clear();

  const q = req.nextUrl.searchParams.get('q') ?? '';
  try {
    return NextResponse.json({ results: await searchCities(q) });
  } catch {
    // Map provider down / slow: the picker lets the person type their city instead.
    return NextResponse.json({ results: [], unavailable: true });
  }
}
