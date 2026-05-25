'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, ShoppingCart } from 'lucide-react';
import Logo from '@/public/image/Drovo-logo-white.png'
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div> */}
              <div>
                <div className="font-bold text-lg leading-none">
                  <Image src={Logo} alt="Drovo Logo" className="h-[30px] w-auto object-contain" />
                </div>
                {/* <div className="text-[9px] text-gray-500 font-medium tracking-widest uppercase mt-0.5">
                  LOCAL DELIVERY
                </div> */}
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Order food, groceries, and essentials from trusted local African vendors. Fast delivery to your doorstep.
            </p>
            {/* <div className="flex gap-3">
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-gray-700 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-gray-700 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-gray-700 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
            </div> */}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {[
                { label: 'Home', href: '/' },
                { label: 'Categories', href: '/categories' },
                { label: 'Browse Businesses', href: '/businesses' },
                { label: 'List Your Business', href: '/list-business' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-orange-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Vendors */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">For Vendors</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              {[
                { label: 'Vendor Dashboard', href: '/dashboard' },
                { label: 'Become a Vendor', href: '/list-business' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Resources', href: '/resources' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-orange-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contact Us</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                <span>Lagos, Nigeria</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                <span>+234 814 975 1518</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                <span>drovo@wealthyrealmint.com</span>
              </li>
            </ul>

            {/* App badges placeholder */}
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
          <p>&copy; {new Date().getFullYear()} Drovo. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-orange-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
