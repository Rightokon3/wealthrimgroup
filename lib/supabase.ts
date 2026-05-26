import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Single client instance for browser use (auth sessions, anon reads)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// Typed helpers
export type UserRole = 'customer' | 'vendor';

export interface Profile {
  id:          string;
  email:       string;
  full_name:   string | null;
  avatar_url:  string | null;
  role:        UserRole;
  phone:       string | null;
  city:        string | null;
  country:     string | null;
  created_at:  string;
  updated_at:  string;
}
