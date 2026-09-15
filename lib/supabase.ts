import { createBrowserClient } from '@supabase/ssr';
import { Profile, UserRole } from '@/types';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// createBrowserClient (from @supabase/ssr) instead of createClient
// (from @supabase/supabase-js) — this writes the session to cookies as
// well as localStorage, so middleware.ts (which reads cookies via
// createServerClient) can actually see that the user is logged in.
// Without this, the browser has a valid session but the server never
// finds it, and every protected route bounces back to login.
export const supabase = createBrowserClient(url, anon);

export type { Profile, UserRole };