'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export function AuthProvider({ children }:{ children:React.ReactNode }) {
  const [user,    setUser]    = useState<User|null>(null);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [session, setSession] = useState<Session|null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (u: User) => {
    const metaRole = u.user_metadata?.role as UserRole|undefined;
    if (metaRole && !profile) {
      setProfile(p => p ?? { id:u.id, email:u.email??'', full_name:u.user_metadata?.full_name??'',
        avatar_url:null, phone:null, role:metaRole, city:null, country:'Nigeria',
        created_at:'', updated_at:'' });
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
    if (data) { setProfile(data as Profile); return; }
    // Profile row missing — create it
    if (metaRole) {
      const { data: ins } = await supabase.from('profiles')
        .upsert({ id:u.id, email:u.email??'', full_name:u.user_metadata?.full_name??'', role:metaRole },
          { onConflict:'id' }).select().single();
      if (ins) setProfile(ins as Profile);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data:{ session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user);
      setLoading(false);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user);
      else setProfile(null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
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
