import type { NextRequest } from 'next/server';



const isLocal = (u: string) => /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u.trim());
const trimSlash = (u: string) => u.trim().replace(/\/+$/, '');
const withProtocol = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

export function getBaseUrl(req?: NextRequest | Request): string {
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Explicit setting
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && env.trim() && !(isProd && isLocal(env))) {
    return trimSlash(withProtocol(env));
  }

  // 2. Vercel
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return trimSlash(`https://${vercelProd.replace(/^https?:\/\//, '')}`);
  const vercel = process.env.VERCEL_URL;
  if (vercel) return trimSlash(`https://${vercel.replace(/^https?:\/\//, '')}`);

  // 3. The request itself
  if (req) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    if (host) {
      const proto = (req.headers.get('x-forwarded-proto') ?? (isLocal(host) ? 'http' : 'https')).split(',')[0].trim();
      return `${proto}://${host}`;
    }
    try { return new URL(req.url).origin; } catch { /* fall through */ }
  }

  // 4. Local development fallback
  return 'http://localhost:3000';
}