'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X, ShoppingCart, PlusCircle, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Categories', href: '/categories' },
  { name: 'Browse All', href: '/businesses' },
  { name: 'For Vendors', href: '/list-business' },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 via-red-500 to-amber-400 origin-left z-[100]"
        style={{ scaleX }}
      />

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/97 backdrop-blur-xl border-b border-orange-100 shadow-sm'
          : 'bg-white/90 backdrop-blur-xl border-b border-orange-50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl leading-none tracking-tight text-gray-900">
                  Afri<span className="text-orange-500">Cart</span>
                </div>
                <div className="text-[9px] text-gray-400 font-medium tracking-widest uppercase -mt-0.5">
                  LOCAL DELIVERY
                </div>
              </div>
            </Link>

            {/* Location pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-sm text-orange-700 cursor-pointer hover:bg-orange-100 transition-colors">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">Lagos, NG</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors relative group ${
                    pathname === item.href
                      ? 'text-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300 ${
                    pathname === item.href ? 'w-full' : 'w-0'
                  }`}></span>
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link
                href="/list-business"
                className="hidden sm:flex items-center gap-2 px-4 h-9 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                List Your Business
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-orange-50 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-orange-100 shadow-xl"
          >
            <div className="px-6 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-3 border-t border-orange-100 mt-2">
                <Link
                  href="/list-business"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  List Your Business
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </>
  );
}
