import { NextRequest, NextResponse } from 'next/server';
import { geoSearch } from '@/lib/geoProvider';
import { rateLimit, clientIp, tooMany } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wait = await rateLimit(`geo-search:${clientIp(req)}`, 20, 60);
  if (wait) return tooMany(wait, 'Too many searches. Please wait a moment.');
  try {
    return NextResponse.json({ results: await geoSearch(req.nextUrl.searchParams.get('q') ?? '') });
  } catch {
    return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 502 });
  }
}