'use client';
import { motion } from 'framer-motion';
import { Home, ShieldCheck, MapPin, PhoneCall, ArrowRight, Building2, KeyRound, Handshake, LucideIcon } from 'lucide-react';

// Update this to point wherever the client's link should go
const EXTERNAL_LINK = 'https://wealthyrealmint.com/amori/';

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: Building2,
    title: 'Verified Listings',
    desc: 'Every property is verified before it goes live — sale, rent, lease or shortlet.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted Agents',
    desc: 'We work only with vetted agents and property managers you can rely on.',
  },
  {
    icon: KeyRound,
    title: 'Fast Transactions',
    desc: 'From inspection to agreement, we keep the process quick and transparent.',
  },
  {
    icon: Handshake,
    title: 'End-to-End Support',
    desc: "Our team supports you from your first inquiry to closing the deal.",
  },
];

export default function RealEstateLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white pt-[64px] overflow-hidden">
        <div className="max-w-[1000px] mx-auto px-6 py-16 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-5xl mb-4">🏠</div>
            <h1 className="text-3xl md:text-5xl font-black mb-4">Drovo Real Estate</h1>
            <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              A trusted real estate arm of Drovo, connecting buyers, renters and tenants
              with verified properties and vetted agents — sale, rent, lease and shortlet,
              all in one place.
            </p>

            <motion.a
              href={EXTERNAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 mt-8 bg-white text-orange-600 font-black px-7 py-3.5 rounded-2xl shadow-2xl hover:bg-gray-50 transition-colors"
            >
              Explore Properties
              <ArrowRight className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-[1000px] mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Why work with us</h2>
          <p className="text-gray-500 text-sm">A real estate experience built on trust and speed.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 hover:shadow-lg hover:shadow-orange-100/60 transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-sm mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA banner */}
      <div className="max-w-[1000px] mx-auto px-6 pb-16">
        <div className="bg-gray-900 rounded-3xl px-8 py-10 text-center relative overflow-hidden">
          <div className="relative z-10">
            <Home className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <h2 className="text-white text-xl md:text-2xl font-black mb-2">
              Ready to find your next property?
            </h2>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              Browse verified listings and connect with an agent today.
            </p>
            <a
              href={EXTERNAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              View Listings
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Contact strip */}
      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-[1000px] mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            Lagos, Nigeria
          </div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-orange-500" />
            Contact us for inquiries
          </div>
        </div>
      </div>
    </div>
  );
}