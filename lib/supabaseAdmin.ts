import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env var: SUPABASE_SERVICE_ROLE_KEY');
}

// Server-only client — uses the service role key, which bypasses RLS.
// NEVER import this file from client components or expose it to the browser.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});