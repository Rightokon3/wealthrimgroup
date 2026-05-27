'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, UserRole } from '@/lib/supabase';

interface AuthContextType {
  user:           User | null;
  profile:        Profile | null;
  session:        Session | null;
  loading:        boolean;   // true until BOTH session AND profile are resolved
  isVendor:       boolean;
  isCustomer:     boolean;
  isLoggedIn:     boolean;
  signUp:         (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null }>;
  signIn:         (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:        () => Promise<void>;
  updateProfile:  (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from DB; also reads role out of user_metadata as a fast-path
  const fetchProfile = useCallback(async (currentUser: User) => {
    // 1. Immediately seed role from user_metadata so isVendor is never
    //    briefly wrong while the DB call is in flight
    const metaRole = currentUser.user_metadata?.role as UserRole | undefined;
    if (metaRole) {
      setProfile(prev => prev
        ? prev
        : { id: currentUser.id, email: currentUser.email ?? '', full_name: currentUser.user_metadata?.full_name ?? '', avatar_url: null, role: metaRole, phone: null, city: null, country: null, created_at: '', updated_at: '' }
      );
    }

    // 2. Fetch the real profile row
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    } else if (error && metaRole) {
      // Profile row missing (trigger may have failed) — create it on the fly
      const { data: inserted } = await supabase
        .from('profiles')
        .upsert({
          id:        currentUser.id,
          email:     currentUser.email ?? '',
          full_name: currentUser.user_metadata?.full_name ?? '',
          role:      metaRole,
        }, { onConflict: 'id' })
        .select()
        .single();
      if (inserted) setProfile(inserted as Profile);
    }
  }, []);

  useEffect(() => {
    // Hydrate on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      }
      setLoading(false);
    });

    // Keep in sync across tabs / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setProfile(null);
        }

        // Only stop showing spinner after we've resolved everything
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store role in user_metadata — available immediately without a DB call
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) return { error: error.message };

    // If email confirmation is disabled in Supabase, create profile immediately
    if (data.user && !data.user.email_confirmed_at === false) {
      await supabase.from('profiles').upsert({
        id:        data.user.id,
        email:     data.user.email ?? '',
        full_name: fullName,
        role,
      }, { onConflict: 'id' });
    }

    return { error: null };
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (
    updates: Partial<Profile>
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not logged in' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return { error: error.message };
    await fetchProfile(user);
    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  // Derive role — prefer DB profile, fall back to user_metadata
  const role = profile?.role ?? (user?.user_metadata?.role as UserRole | undefined);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isVendor:   role === 'vendor',
      isCustomer: role === 'customer',
      isLoggedIn: !!user,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
