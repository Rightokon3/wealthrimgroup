'use client';
import Link from 'next/link';
import { Mail, Phone, MapPin, Bike } from 'lucide-react';
import Logo from '@/public/image/Drovo-logo-white.png';
import Image from 'next/image';

const FOOTER_LINKS = {
  explore: [
    { label: '🍛 Food & Delivery',   href: '/categories/food' },
    { label: '🏠 Real Estate',        href: '/categories/real-estate' },
    { label: '👗 Fashion & Fabric',   href: '/categories/fashion' },
  ],
  vendors: [
    { label: 'Become a Vendor',       href: '/auth/signup' },
    { label: 'Vendor Dashboard',      href: '/vendor/dashboard' },
    { label: 'Add a Product',         href: '/vendor/products/new' },
    { label: 'Vendor Setup Guide',    href: '/vendor/setup' },
  ],
  riders: [
    { label: 'Become a Rider',        href: '/rider/signup' },
    { label: 'Rider Dashboard',       href: '/rider/dashboard' },
    { label: 'Rider Login',           href: '/rider/login' },
  ],
  company: [
    { label: 'Privacy Policy',        href: '/privacy' },
    { label: 'Terms of Service',      href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">

          {/* Brand — takes 2 cols on md */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <Image src={Logo} alt="Drovo Logo" className="h-[30px] w-auto object-contain" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5 max-w-xs">
              Africa's marketplace for food, fashion & real estate. Connecting local vendors with customers across the continent.
            </p>
            {/* Contact */}
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Lagos, Nigeria</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>+234 814 975 1518</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>drovo@wealthyrealmint.com</span>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Explore</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {FOOTER_LINKS.explore.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-orange-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Vendors */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">For Vendors</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {FOOTER_LINKS.vendors.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-orange-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Riders */}
          <div>
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">
              <span className="flex items-center gap-2"><Bike className="w-4 h-4 text-green-400" /> For Riders</span>
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {FOOTER_LINKS.riders.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-green-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>

            {/* Rider CTA */}
            <Link href="/rider/signup"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-all">
              <Bike className="w-3.5 h-3.5" /> Join as Rider →
            </Link>

            {/* App badges */}
            <div className="mt-5 flex gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-500 transition-colors cursor-pointer">
                🍎 App Store
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-500 transition-colors cursor-pointer">
                🤖 Google Play
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Drovo. All rights reserved.</p>
          <div className="flex gap-6">
            {FOOTER_LINKS.company.map(({ label, href }) => (
              <Link key={href} href={href} className="hover:text-orange-400 transition-colors">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}