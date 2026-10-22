import { NextRequest, NextResponse } from 'next/server';
import { geoReverse } from '@/lib/geoProvider';
import { rateLimit, clientIp, tooMany } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wait = await rateLimit(`geo-reverse:${clientIp(req)}`, 60, 60);   // dragging a pin makes many calls
  if (wait) return tooMany(wait);
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Bad coordinates' }, { status: 400 });
  }
  return NextResponse.json({ result: await geoReverse(lat, lng) });
}