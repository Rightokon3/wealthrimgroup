'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Store, Users,
  Shield, ShieldPlus, Settings, LogOut, Menu, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';

const NAV = [
  { href: '/admin',               label: 'Dashboard',      icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/orders',        label: 'Orders',         icon: <ShoppingBag className="w-4 h-4" /> },
  { href: '/admin/stores',        label: 'Stores',         icon: <Store className="w-4 h-4" /> },
  { href: '/admin/users',         label: 'Users',          icon: <Users className="w-4 h-4" /> },
  { href: '/admin/manage-admins', label: 'Manage Admins',  icon: <ShieldPlus className="w-4 h-4" /> },
  { href: '/admin/settings',      label: 'Settings',       icon: <Settings className="w-4 h-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, loading: al, signOut } = useAuth();
  const [checked,  setChecked]  = useState(false);
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    if (al) return;
    if (!isLoggedIn) { router.replace('/auth/login?next=/admin'); return; }

    // Verify admin role directly from DB — don't trust client state alone.
    // Both 'admin' and 'super_admin' are allowed into the panel; the
    // distinction between them is enforced per-feature, not at this gate.
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== 'admin' && data?.role !== 'super_admin') { router.replace('/'); return; }
        setChecked(true);
      });
  }, [al, isLoggedIn, user]);

  if (!checked) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile overlay */}
      {sideOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-60 bg-gray-900 border-r border-gray-800
        flex flex-col z-50 transition-transform duration-300
        ${sideOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-white text-sm">Drovo</div>
              <div className="text-xs text-orange-400 font-bold">Admin Panel</div>
            </div>
          </div>
          {user && <NotificationBell userId={user.id} />}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(n => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                {n.icon} {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={async () => { await signOut(); router.push('/auth/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-800 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header className="lg:hidden bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSideOpen(v => !v)} className="text-gray-400 hover:text-white">
              {sideOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-black text-white text-sm">Drovo Admin</span>
          </div>
          {user && <NotificationBell userId={user.id} />}
        </header>

        <main className="flex-1 overflow-auto bg-gray-950 p-6">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}