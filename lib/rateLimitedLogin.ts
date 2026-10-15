import { supabase } from '@/lib/supabase';

// Browser helper: logs in through /api/auth/login (which counts wrong passwords and locks after 5),
// then gives the session to the Supabase client so the rest of the app works exactly as before.
export async function rateLimitedLogin(email: string, password: string): Promise<{ error?: string; user?: { id: string } }> {
  let res: Response;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.session) return { error: j.error ?? 'Login failed. Try again.' };

  const { data, error } = await supabase.auth.setSession({
    access_token: j.session.access_token,
    refresh_token: j.session.refresh_token,
  });
  if (error || !data.user) return { error: 'Could not start your session. Try again.' };
  return { user: { id: data.user.id } };
}