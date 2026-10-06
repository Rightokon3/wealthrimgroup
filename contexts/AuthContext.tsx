'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

interface AuthCtx {
  user: User|null; profile: Profile|null; session: Session|null;
  loading: boolean; isVendor: boolean; isCustomer: boolean; isLoggedIn: boolean;
  signUp:(email:string,password:string,fullName:string,role:UserRole)=>Promise<{error:string|null}>;
  signIn:(email:string,password:string)=>Promise<{error:string|null}>;
  signOut:()=>Promise<void>;
  updateProfile:(u:Partial<Profile>)=>Promise<{error:string|null}>;
  refreshProfile:()=>Promise<void>;
}
const Ctx = createContext<AuthCtx|null>(null);

// One slow or stuck request must never keep the whole app on a spinner.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(undefined), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(() => { clearTimeout(t); resolve(undefined); });
  });
}

// Supabase hands us a brand-new user object every time the login token refreshes
// (for example when you come back to an idle tab). Pages that depend on `user` would then
// reload all their data. So we keep the SAME object unless something really changed.
const sameUser = (a: User | null, b: User | null) =>
  a === b ||
  (!!a && !!b &&
    a.id === b.id &&
    a.email_confirmed_at === b.email_confirmed_at &&
    a.updated_at === b.updated_at);

export function AuthProvider({ children }:{ children:React.ReactNode }) {
  const [user,    setUser]    = useState<User|null>(null);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [session, setSession] = useState<Session|null>(null);
  const [loading, setLoading] = useState(true);

  const profileRef = useRef<Profile|null>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Same reasoning as above: only replace the profile object if it actually changed
  const setProfileIfChanged = useCallback((next: Profile) => {
    setProfile(prev =>
      prev && prev.id === next.id && prev.updated_at === next.updated_at && prev.role === next.role
        ? prev
        : next
    );
  }, []);

  const fetchProfile = useCallback(async (u: User) => {
    try {
      const metaRole = u.user_metadata?.role as UserRole|undefined;
      if (metaRole && !profileRef.current) {
        setProfile(p => p ?? { id:u.id, email:u.email??'', full_name:u.user_metadata?.full_name??'',
          first_name:null, last_name:null,
          avatar_url:null, phone:null, role:metaRole, city:null, country:'Nigeria',
          created_at:'', updated_at:'' });
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
      if (data) { setProfileIfChanged(data as Profile); return; }
      // Profile row missing — create it
      if (metaRole) {
        const { data: ins } = await supabase.from('profiles')
          .upsert({ id:u.id, email:u.email??'', full_name:u.user_metadata?.full_name??'', role:metaRole },
            { onConflict:'id' }).select().single();
        if (ins) setProfileIfChanged(ins as Profile);
      }
    } catch (err) {
      console.warn('Could not load profile:', err);
    }
  }, [setProfileIfChanged]);

  useEffect(() => {
    let active = true;

    const applySession = (next: Session | null) => {
      setSession(next);
      const nextUser = next?.user ?? null;
      setUser(prev => (sameUser(prev, nextUser) ? prev : nextUser));
    };

    // First load
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        applySession(session);
        if (session?.user) await withTimeout(fetchProfile(session.user), 8000);
      } catch (err) {
        console.warn('Could not read the session:', err);
      } finally {
        if (active) setLoading(false); // ALWAYS finish loading, even if something failed
      }
    })();

    // Later changes: signed in/out, token refreshed, returning to an idle tab, ...
    // IMPORTANT: this callback is deliberately NOT async and makes NO Supabase calls directly.
    // Awaiting Supabase inside it can deadlock the whole client (every query then hangs
    // until the page is refreshed). Work is deferred with setTimeout instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Nothing new to learn from these two events
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      const u = session.user;
      setTimeout(async () => {
        try {
          await withTimeout(fetchProfile(u), 8000);
        } finally {
          if (active) setLoading(false);
        }
      }, 0);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, [fetchProfile]);

  const signUp = async (email:string, password:string, fullName:string, role:UserRole) => {
    const { error } = await supabase.auth.signUp({ email, password,
      options: { data:{ full_name:fullName, role }, emailRedirectTo:`${window.location.origin}/auth/callback` } });
    return { error: error?.message ?? null };
  };
  const signIn = async (email:string, password:string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setSession(null);
  };
  const updateProfile = async (updates:Partial<Profile>) => {
    if (!user) return { error:'Not logged in' };
    const { error } = await supabase.from('profiles')
      .update({ ...updates, updated_at:new Date().toISOString() }).eq('id', user.id);
    if (!error) await fetchProfile(user);
    return { error: error?.message ?? null };
  };

  const role = profile?.role ?? (user?.user_metadata?.role as UserRole|undefined);
  return (
    <Ctx.Provider value={{ user, profile, session, loading,
      isVendor: role==='vendor', isCustomer: role==='customer', isLoggedIn: !!user,
      signUp, signIn, signOut, updateProfile, refreshProfile: ()=>user?fetchProfile(user):Promise.resolve() }}>
      {children}
    </Ctx.Provider>
  );
}
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}