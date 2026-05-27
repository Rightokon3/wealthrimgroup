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

  // Refresh the session so cookies stay valid
  const { data: { user } } = await supabase.auth.getUser();

  // Only guard: unauthenticated users cannot reach /account
  // Everything else (vendor pages, list-business) is handled
  // client-side in the page components — middleware role checks
  // are unreliable because the session cookie is sometimes not
  // yet available on the first edge request after login.
  const guestOnlyPaths = ['/account'];
  if (guestOnlyPaths.some(p => pathname.startsWith(p)) && !user) {
    const url = new URL('/auth/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Only run middleware where we need it
  matcher: ['/account/:path*'],
};
