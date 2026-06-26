'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, isLoggedIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const next = params.get('next') || '/';

  useEffect(() => { if (!loading && isLoggedIn) router.replace(next); }, [isLoggedIn, loading, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) { setError(error.includes('Invalid login') ? 'Incorrect email or password.' : error); setSubmitting(false); return; }
    router.push(next);
  };

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen pt-[64px] bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4">
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/60 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-8 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3"><ShoppingCart className="w-7 h-7 text-white"/></div>
            <h1 className="text-2xl font-black text-white">Welcome back</h1>
            <p className="text-orange-100 text-sm mt-1">Sign in to your AfriCart account</p>
          </div>
          <div className="px-8 py-8">
            {error && <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="flex items-start gap-3 p-4 mb-5 rounded-xl bg-red-50 border border-red-200"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/><p className="text-red-600 text-sm font-medium">{error}</p></motion.div>}
            {params.get('next') && <div className="p-3 mb-5 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 text-sm font-medium text-center">Please sign in to continue</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Email Address</label>
                <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className={`${ic} pl-10`} placeholder="you@example.com"/></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Password</label></div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                  <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} className={`${ic} pl-10 pr-10`} placeholder="••••••••"/>
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {submitting?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Signing in...</>:<>Sign In <ArrowRight className="w-4 h-4"/></>}
              </button>
            </form>
            <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-gray-400 font-medium">Don't have an account?</span><div className="flex-1 h-px bg-gray-200"/></div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/auth/signup?role=customer" className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50 transition-all">🛒 Customer</Link>
              <Link href="/auth/signup?role=vendor" className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 transition-all">🏪 Vendor</Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>}><LoginInner/></Suspense>;
}
