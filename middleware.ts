import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Routes that require any logged-in user
const PROTECTED_ROUTES = ['/account', '/account/orders'];

// Routes that require vendor role specifically
const VENDOR_ROUTES = ['/vendor', '/dashboard'];

// Routes that should redirect to home if already logged in
const AUTH_ROUTES = ['/auth/login', '/auth/signup'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll:    () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect logged-in users away from /auth/login and /auth/signup
  if (AUTH_ROUTES.some(r => pathname.startsWith(r)) && user) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Redirect guests trying to reach protected routes
  if (PROTECTED_ROUTES.some(r => pathname.startsWith(r)) && !user) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vendor-only routes — redirect guests and non-vendors
  if (VENDOR_ROUTES.some(r => pathname.startsWith(r))) {
    if (!user) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'vendor') {
      return NextResponse.redirect(new URL('/?error=vendor_only', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/account/:path*',
    '/vendor/:path*',
    '/dashboard/:path*',
    '/auth/login',
    '/auth/signup',
  ],
};
