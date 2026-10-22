import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Shared rate limiter. Counts live in Supabase, so every server / serverless instance
 * sees the same numbers (an in-memory counter would reset on each instance).
 *
 *   const wait = await rateLimit(`pay:${admin.id}`, 20, 60);   // 20 per 60 seconds
 *   if (wait) return tooMany(wait);
 *
 * Returns 0 when allowed, otherwise the seconds to wait.
 * failClosed: true  -> if the database cannot be reached, refuse (use for MONEY routes)
 * failClosed: false -> if the database cannot be reached, allow (use for everything else,
 *                      so a limiter problem never locks real customers out)
 */
export async function rateLimit(
  key: string, max: number, windowSeconds: number, opts: { failClosed?: boolean } = {},
): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('rate_limit_hit', {
      p_key: key.slice(0, 200), p_max: max, p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    if (Math.random() < 0.01) supabaseAdmin.rpc('rate_limit_cleanup').then(() => {}, () => {});
    return Number(data ?? 0);
  } catch (e) {
    console.error('[rateLimit] check failed:', (e as any)?.message ?? e);
    return opts.failClosed ? 30 : 0;
  }
}

export function clientIp(req: Request | NextRequest): string {
  const h = req.headers;
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
}

export function tooMany(seconds: number, message?: string) {
  const mins = Math.ceil(seconds / 60);
  return NextResponse.json(
    {
      error: message ?? `Too many requests. Please try again in ${seconds < 90 ? `${seconds} seconds` : `${mins} minutes`}.`,
      retryAfter: seconds,
    },
    { status: 429, headers: { 'Retry-After': String(seconds) } },
  );
}