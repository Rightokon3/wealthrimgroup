import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Hard-guard at the edge: no session at all → bounce before the page
  // even renders. Role/verification checks (email_verified, is_active)
  // still happen client-side in the page components — those need a DB
  // lookup beyond the auth session, and doing that here risks redirect
  // loops before the session is fully synced. This layer only answers
  // "is anyone logged in at all".
  if (!user) {
    if (pathname.startsWith('/account')) {
      const url = new URL('/auth/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/rider/dashboard') || pathname.startsWith('/rider/orders')) {
      const url = new URL('/rider/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/account/:path*',
    '/rider/dashboard/:path*',
    '/rider/orders/:path*',
    '/admin/:path*',
  ],
};