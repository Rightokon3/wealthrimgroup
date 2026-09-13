'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Store, Utensils, Shirt, Building2, Package, ShoppingBag,
  TrendingUp, CheckCircle, ArrowRight, Percent, Banknote
} from 'lucide-react';

const STEPS = [
  {
    icon: Store,
    title: '1. Create your store',
    desc: 'Pick your business type — Food, Fashion, or Real Estate — then add your store name, description, logo and cover photo.',
  },
  {
    icon: Package,
    title: '2. Add your products',
    desc: 'List what you sell: dishes, clothing items, or property listings. Add photos, prices, and details buyers need to decide.',
  },
  {
    icon: ShoppingBag,
    title: '3. Receive orders',
    desc: 'Customers browse and order directly from your store. You\'ll get notified instantly when a new order comes in.',
  },
  {
    icon: TrendingUp,
    title: '4. Get paid',
    desc: 'Track your earnings from the dashboard. Payouts are sent to your registered bank account after each completed order.',
  },
];

const CATEGORIES = [
  { icon: Utensils,  label: 'Food & Delivery',  desc: 'Restaurants, home cooks, cafés, groceries' },
  { icon: Shirt,     label: 'Fashion & Fabric',  desc: 'Clothing, fabric, accessories, footwear' },
  { icon: Building2, label: 'Real Estate',       desc: 'Property sales, rentals, land listings' },
];

export default function VendorGuidePage() {
  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 py-14 text-white">
        <div className="max-w-[860px] mx-auto px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Vendor Setup Guide</h1>
          <p className="text-orange-100 text-lg max-w-xl mx-auto">
            Everything you need to know about selling on Drovo — from creating your store to getting paid.
          </p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 py-12 space-y-14">

        {/* Steps */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">How it works</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-black text-gray-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* What you can sell */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">What can I sell?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <Icon className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                  <h3 className="font-black text-gray-900 text-sm mb-1">{c.label}</h3>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Fees */}
        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-6 sm:p-8">
          <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <Percent className="w-5 h-5 text-amber-600" /> Platform Fees
          </h2>
          <p className="text-sm text-amber-800 mb-5">
            Drovo charges a flat 10% platform fee on every completed sale. Here's how it breaks down on a ₦10,000 order:
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: 'Customer Pays', value: '₦10,000' },
              { label: 'Drovo Fee (10%)', value: '− ₦1,000' },
              { label: 'You Receive (90%)', value: '₦9,000' },
            ].map(r => (
              <div key={r.label} className="bg-white rounded-xl p-4 text-center border border-amber-100">
                <div className="text-xl font-black text-gray-900">{r.value}</div>
                <div className="text-xs text-gray-500 mt-1">{r.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-amber-700">
            <Banknote className="w-3.5 h-3.5 flex-shrink-0" />
            Payouts are sent to your registered bank account within 24–48 hours of order completion.
          </div>
        </section>

        {/* Checklist */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">Before you start, have ready:</h2>
          <ul className="space-y-3">
            {[
              'Your store name and a short description of what you sell',
              'A logo and cover photo (optional, but recommended)',
              'Your business address, phone number, and WhatsApp',
              'Photos and prices for your first few products or listings',
            ].map(item => (
              <li key={item} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center bg-gray-950 rounded-2xl p-8 sm:p-10">
          <h2 className="text-2xl font-black text-white mb-2">Ready to get started?</h2>
          <p className="text-gray-400 text-sm mb-6">Set up your store in a few minutes — it's free.</p>
          <Link href="/vendor/setup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black hover:from-orange-600 hover:to-red-700 transition-all shadow-xl">
            Set Up My Store <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}