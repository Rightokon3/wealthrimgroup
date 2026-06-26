'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Menu, X, ChevronDown, LogOut,
  User, LayoutDashboard, Store, Package, Settings,
  Utensils, Home as HomeIcon, Shirt
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';
import Logo from '@/public/image/Drovo-logo-2.png';

export default function Navigation() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, profile, isVendor, isLoggedIn, loading, signOut } = useAuth();
  const { totalItems, store: cartStore } = useCart();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0,1], [0,1]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSignOut = async () => {
    await signOut(); setUserMenuOpen(false); router.push('/');
  };

  const avatar = profile?.full_name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <>
      <motion.div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-red-500 to-amber-400 origin-left z-[100]" style={{scaleX}}/>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled?'bg-white/97 backdrop-blur-xl border-b border-gray-200 shadow-sm':'bg-white/90 backdrop-blur-xl border-b border-gray-100'}`}>
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5 text-white"/>
            </div>
            <div>
              <div className="font-black text-xl leading-none text-gray-900">Afri<span className="text-orange-500">Cart</span></div>
              <div className="text-[9px] text-gray-400 tracking-widest uppercase -mt-0.5">Marketplace</div>
            </div> */}
             <div>
                <div className="font-bold text-xl leading-none tracking-tight text-gray-900">
                  <Image src={Logo} alt="Drovo Logo" className="h-[100px] w-[100px] object-contain" />
                </div>
              </div>
          </Link>

          {/* Category nav — desktop */}
            <div className="hidden md:flex items-center gap-1">
            {[
              { href:'/categories/food',        label:'🍛 Food',       active: false },
              { href:'/categories/real-estate', label:'🏠 Real Estate', active: false },
              { href:'/categories/fashion',      label:'👗 Fashion',    active: false },
            ].map(item=>(
              <Link key={item.href} href={item.href}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-all">
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            {totalItems > 0 && (
              <Link href="/checkout"
                className="flex items-center gap-2 px-4 h-9 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-bold hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200">
                <ShoppingCart className="w-4 h-4"/>
                <span>{totalItems}</span>
                {cartStore && <span className="hidden sm:inline text-orange-100 text-xs">· {cartStore.name}</span>}
              </Link>
            )}

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"/>
            ) : isLoggedIn ? (
              <div ref={menuRef} className="relative">
                <button onClick={()=>setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-3 h-9 rounded-full border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover"/> : avatar}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[80px] truncate">{profile?.full_name?.split(' ')[0]??'Account'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen?'rotate-180':''}`}/>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{opacity:0,y:8,scale:.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.95}} transition={{duration:.15}}
                      className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                        <p className="font-bold text-gray-900 text-sm truncate">{profile?.full_name??'User'}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${isVendor?'bg-amber-100 text-amber-700':'bg-orange-100 text-orange-700'}`}>
                          {isVendor?'🏪 Vendor':'🛒 Customer'}
                        </span>
                      </div>
                      <div className="p-1.5">
                        {isVendor ? (<>
                          <Link href="/vendor/dashboard" onClick={()=>setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"><LayoutDashboard className="w-4 h-4"/>Dashboard</Link>
                          <Link href="/vendor/products/new" onClick={()=>setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"><Package className="w-4 h-4"/>Add Product</Link>
                        </>) : (<>
                          <Link href="/account" onClick={()=>setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"><User className="w-4 h-4"/>My Account</Link>
                          <Link href="/orders" onClick={()=>setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"><ShoppingCart className="w-4 h-4"/>My Orders</Link>
                        </>)}
                      </div>
                      <div className="p-1.5 border-t border-gray-100">
                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="w-4 h-4"/>Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="hidden sm:flex items-center px-4 h-9 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:border-orange-300 hover:bg-orange-50 transition-all">Sign In</Link>
                <Link href="/auth/signup" className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-bold hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-200 transition-all">Join Free</Link>
              </>
            )}

            <button onClick={()=>setMobileOpen(!mobileOpen)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-orange-50 transition-colors">
              {mobileOpen?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen&&(
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
              className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-orange-100 shadow-xl">
              <div className="px-6 py-4 space-y-1">
                 {[
              { href:'/categories/food',        label:'🍛 Food',       active: false },
              { href:'/categories/real-estate', label:'🏠 Real Estate', active: false },
              { href:'/categories/fashion',      label:'👗 Fashion',    active: false },
            ].map(item=>(
              <Link key={item.href} href={item.href}
                className="flex flex-colpx-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-all">
                {item.label}
              </Link>
            ))}
                <div className="pt-3 border-t border-orange-100 mt-2 space-y-1">
                  {isLoggedIn ? (<>
                    {isVendor&&<Link href="/vendor/dashboard" onClick={()=>setMobileOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm font-bold text-amber-700 hover:bg-amber-50">🏪 Dashboard</Link>}
                    <Link href="/orders" onClick={()=>setMobileOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">My Orders</Link>
                    <button onClick={handleSignOut} className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">Sign Out</button>
                  </>) : (<>
                    <Link href="/auth/login" onClick={()=>setMobileOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-700">Sign In</Link>
                    <Link href="/auth/signup" onClick={()=>setMobileOpen(false)} className="block py-2.5 px-3 rounded-lg text-sm font-bold text-orange-600 hover:bg-orange-50">Join Free</Link>
                  </>)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
