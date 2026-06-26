'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, TrendingUp, Plus, Eye,
  Edit3, ToggleRight, ToggleLeft, Clock, CheckCircle, XCircle,
  Truck, Bell, LogOut, Star, ChevronRight, Banknote, Percent,
  Store as StoreIcon
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Product, Order, CATEGORY_META, OrderStatus } from '@/types';

type Tab = 'overview'|'products'|'orders'|'earnings';

const STATUS_STYLE: Record<OrderStatus,string> = {
  pending:    'bg-amber-100 text-amber-700 border-amber-200',
  confirmed:  'bg-blue-100 text-blue-700 border-blue-200',
  preparing:  'bg-purple-100 text-purple-700 border-purple-200',
  ready:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  on_the_way: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered:  'bg-green-100 text-green-700 border-green-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
  refunded:   'bg-gray-100 text-gray-600 border-gray-200',
};
const STATUS_NEXT: Partial<Record<OrderStatus,OrderStatus>> = {
  pending:'confirmed', confirmed:'preparing', preparing:'ready', ready:'on_the_way', on_the_way:'delivered',
};

export default function VendorDashboard() {
  const router = useRouter();
  const { user, profile, isVendor, isLoggedIn, loading: al, signOut } = useAuth();
  const [tab,      setTab]      = useState<Tab>('overview');
  const [store,    setStore]    = useState<Store|null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (al) return;
    if (!isLoggedIn) { router.replace('/auth/login?next=/vendor/dashboard'); return; }
  }, [al, isLoggedIn, router]);

  useEffect(() => {
    if (user && isVendor) fetchAll();
    else if (user && profile && !isVendor) router.replace('/');
  }, [user, isVendor, profile]);

  async function fetchAll() {
    setLoading(true);
    const { data: s } = await supabase.from('stores').select('*').eq('vendor_id', user!.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!s) { router.replace('/vendor/setup'); return; }
    setStore(s);
    const [pr, or] = await Promise.all([
      supabase.from('products').select('*').eq('store_id', s.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*)').eq('store_id', s.id).order('created_at', { ascending: false }),
    ]);
    setProducts(pr.data ?? []);
    setOrders(or.data ?? []);
    setLoading(false);
  }

  async function toggleProduct(id: string, cur: boolean) {
    await supabase.from('products').update({ is_available: !cur }).eq('id', id);
    setProducts(p => p.map(x => x.id === id ? { ...x, is_available: !cur } : x));
  }

  async function advanceOrder(id: string, next: OrderStatus) {
    await supabase.from('orders').update({ status: next }).eq('id', id);
    setOrders(o => o.map(x => x.id === id ? { ...x, status: next } : x));
  }

  if (al || (isLoggedIn && !profile)) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!store && !loading) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-orange-50 px-4">
      <div className="text-center max-w-sm">
        <StoreIcon className="w-14 h-14 text-orange-300 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">No store yet</h2>
        <p className="text-gray-400 text-sm mb-5">Set up your store first to start selling.</p>
        <Link href="/vendor/setup" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">Set Up My Store</Link>
      </div>
    </div>
  );

  // ── computed stats ────────────────────────────────────────────────────────
  const totalRevenue    = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.subtotal, 0);
  const totalPlatformFee= orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.platform_fee, 0);
  const totalVendorPayout= orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.vendor_payout, 0);
  const pendingOrders   = orders.filter(o => ['pending','confirmed','preparing','ready','on_the_way'].includes(o.status));
  const meta            = store ? CATEGORY_META[store.category] : null;

  const NAV: { id:Tab; label:string; icon:React.ReactNode; badge?:number }[] = [
    { id:'overview',  label:'Overview',  icon:<LayoutDashboard className="w-4 h-4"/> },
    { id:'products',  label:`${meta?.productLabel ?? 'Products'}s`, icon:<Package className="w-4 h-4"/>, badge:products.length },
    { id:'orders',    label:'Orders',    icon:<ShoppingBag className="w-4 h-4"/>, badge:pendingOrders.length||undefined },
    { id:'earnings',  label:'Earnings',  icon:<TrendingUp className="w-4 h-4"/> },
  ];

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-950 text-white flex flex-col sticky top-[64px] h-[calc(100vh-64px)]">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            {store?.logo_url
              ? <img src={store.logo_url} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" alt="" />
              : <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-black text-white flex-shrink-0">{store?.name?.charAt(0)}</div>
            }
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{store?.name}</div>
              <div className="text-xs text-orange-400 font-semibold">{meta?.icon} {meta?.label}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===n.id?'bg-orange-500 text-white':'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span className="flex-shrink-0">{n.icon}</span>
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge !== undefined && n.badge > 0 && (
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${tab===n.id?'bg-white/20':'bg-orange-500 text-white'}`}>{n.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link href={`/store/${store?.id}`}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
            <Eye className="w-4 h-4 flex-shrink-0"/> View My Store
          </Link>
          <Link href="/vendor/products/new"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-orange-400 hover:bg-gray-800 transition-all">
            <Plus className="w-4 h-4 flex-shrink-0"/> Add {meta?.productLabel}
          </Link>
          <button onClick={async()=>{await signOut();router.push('/');}}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-800 hover:text-white transition-all">
            <LogOut className="w-4 h-4 flex-shrink-0"/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-black text-gray-900 capitalize">{tab}</h1>
            <p className="text-xs text-gray-400">
              {tab==='overview'&&'Your store at a glance'}
              {tab==='products'&&`${products.length} ${meta?.productLabel ?? 'product'}s listed`}
              {tab==='orders'&&`${pendingOrders.length} active orders`}
              {tab==='earnings'&&'Revenue & payout breakdown'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingOrders.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Bell className="w-3.5 h-3.5"/> {pendingOrders.length} pending
              </div>
            )}
            <Link href="/vendor/products/new"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-200">
              <Plus className="w-4 h-4"/> Add {meta?.productLabel}
            </Link>
          </div>
        </div>

        <div className="p-6">

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {tab==='overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Total Revenue',   value:`₦${totalRevenue.toLocaleString()}`,        icon:<Banknote className="w-5 h-5"/>,  color:'from-orange-500 to-red-500' },
                  { label:'Platform Fee (10%)',value:`₦${totalPlatformFee.toLocaleString()}`,   icon:<Percent className="w-5 h-5"/>,  color:'from-gray-500 to-gray-600' },
                  { label:'Your Earnings',   value:`₦${totalVendorPayout.toLocaleString()}`,    icon:<TrendingUp className="w-5 h-5"/>,'color':'from-green-500 to-emerald-500' },
                  { label:'Active Orders',   value:pendingOrders.length,                         icon:<ShoppingBag className="w-5 h-5"/>, color:'from-blue-500 to-indigo-500' },
                ].map((s,i) => (
                  <motion.div key={s.label} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*.07}}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>{s.icon}</div>
                    <div className="text-2xl font-black text-gray-900 mb-1">{s.value}</div>
                    <div className="text-xs text-gray-400 font-medium">{s.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Earnings explanation */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5">
                <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-orange-500"/> How AfriCart Fees Work
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  {[
                    { label:'Customer Pays', value:'₦10,000', color:'text-gray-700' },
                    { label:'AfriCart Fee (10%)', value:'− ₦1,000', color:'text-red-600' },
                    { label:'You Receive (90%)', value:'₦9,000', color:'text-green-600' },
                  ].map(r => (
                    <div key={r.label} className="bg-white rounded-xl p-3 text-center border border-orange-100">
                      <div className={`text-xl font-black ${r.color}`}>{r.value}</div>
                      <div className="text-xs text-gray-400 mt-1">{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h3 className="font-black text-gray-900">Recent Orders</h3>
                  <button onClick={()=>setTab('orders')} className="text-xs text-orange-500 font-bold flex items-center gap-1">View all <ChevronRight className="w-3 h-3"/></button>
                </div>
                {orders.slice(0,5).map(o => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{o.order_number}</div>
                      <div className="text-xs text-gray-400">{o.delivery_city} · ₦{o.total.toLocaleString()}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[o.status]}`}>{o.status.replace(/_/g,' ')}</span>
                  </div>
                ))}
                {orders.length===0 && <div className="py-10 text-center text-gray-400 text-sm">No orders yet.</div>}
              </div>
            </div>
          )}

          {/* ── PRODUCTS ─────────────────────────────────────────────── */}
          {tab==='products' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Link href="/vendor/products/new"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-200">
                  <Plus className="w-4 h-4"/> Add {meta?.productLabel}
                </Link>
              </div>
              {loading ? [1,2,3].map(i=><div key={i} className="animate-pulse bg-white rounded-2xl h-20 border border-gray-100"/>)
              : products.length===0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
                  <h3 className="font-black text-gray-700 mb-2">No {meta?.productLabel}s yet</h3>
                  <p className="text-gray-400 text-sm mb-5">Add your first {meta?.productLabel?.toLowerCase()} to start selling.</p>
                  <Link href="/vendor/products/new" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">Add First Item</Link>
                </div>
              ) : products.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {p.image_url?<img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/>
                      :<div className="w-full h-full flex items-center justify-center text-2xl">{meta?.icon}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-black text-gray-900 truncate">{p.name}</h3>
                      {p.is_featured&&<span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">🔥 Featured</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-black text-orange-600 text-sm">₦{p.price.toLocaleString()}</span>
                      {store?.category==='food'    && p.prep_time_min && <span>⏱ {p.prep_time_min} min</span>}
                      {store?.category==='real_estate' && p.bedrooms  && <span>🛏 {p.bedrooms} bed</span>}
                      {store?.category==='fashion' && p.stock_qty!==undefined && <span>📦 Stock: {p.stock_qty}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.is_available?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                      {p.is_available?'Available':'Hidden'}
                    </span>
                    <Link href={`/vendor/products/new?id=${p.id}`}
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors">
                      <Edit3 className="w-4 h-4"/>
                    </Link>
                    <button onClick={()=>toggleProduct(p.id, p.is_available)}
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-amber-50 hover:text-amber-500 transition-colors">
                      {p.is_available?<ToggleRight className="w-4 h-4"/>:<ToggleLeft className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ORDERS ───────────────────────────────────────────────── */}
          {tab==='orders' && (
            <div className="space-y-4">
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {['all','pending','preparing','on_the_way','delivered','cancelled'].map(s=>(
                  <span key={s} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all ${s==='all'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                    {s.replace(/_/g,' ')} {s==='all'?`(${orders.length})`:s==='pending'?`(${pendingOrders.length})`:''}
                  </span>
                ))}
              </div>

              {loading?[1,2,3].map(i=><div key={i} className="animate-pulse bg-white rounded-2xl h-24 border border-gray-100"/>)
              :orders.length===0?(
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4"/>
                  <h3 className="font-black text-gray-700 mb-2">No orders yet</h3>
                  <p className="text-gray-400 text-sm">Orders will appear here when customers purchase.</p>
                </div>
              ):orders.map(o=>(
                <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-gray-900">{o.order_number}</h4>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[o.status]}`}>{o.status.replace(/_/g,' ')}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {o.delivery_address}, {o.delivery_city} · {o.customer_phone} · {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-gray-900">₦{o.total.toLocaleString()}</div>
                      <div className="text-xs text-green-600 font-semibold">You get: ₦{o.vendor_payout.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Fee: ₦{o.platform_fee.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Items */}
                  {o.order_items && o.order_items.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                      {o.order_items.map((item,i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.quantity}× {item.name}</span>
                          <span className="font-bold text-gray-900">₦{item.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {STATUS_NEXT[o.status] && (
                      <button onClick={()=>advanceOrder(o.id, STATUS_NEXT[o.status]!)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5"/>
                        Mark as {STATUS_NEXT[o.status]?.replace(/_/g,' ')}
                      </button>
                    )}
                    {o.status==='pending' && (
                      <button onClick={()=>advanceOrder(o.id,'cancelled')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-colors">
                        <XCircle className="w-3.5 h-3.5"/> Cancel
                      </button>
                    )}
                    {o.delivery_type==='delivery' && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                        <Truck className="w-3 h-3"/> Delivery
                      </span>
                    )}
                    {o.delivery_type==='viewing' && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3"/> Viewing
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── EARNINGS ─────────────────────────────────────────────── */}
          {tab==='earnings' && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label:'Gross Revenue', value:`₦${totalRevenue.toLocaleString()}`, sub:'All delivered orders', color:'text-gray-900' },
                  { label:'Platform Fee (10%)', value:`− ₦${totalPlatformFee.toLocaleString()}`, sub:'AfriCart commission', color:'text-red-600' },
                  { label:'Net Payout (90%)', value:`₦${totalVendorPayout.toLocaleString()}`, sub:'What you receive', color:'text-green-600' },
                ].map(s=>(
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className={`text-2xl font-black mb-1 ${s.color}`}>{s.value}</div>
                    <div className="text-sm font-bold text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Fee explainer */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Fee Breakdown per Order</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">Customer pays</span>
                    <span className="font-bold text-gray-900">₦10,000 (example)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">AfriCart platform fee</span>
                    <span className="font-bold text-red-600">− ₦1,000 (10%)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="font-bold text-gray-900">You receive</span>
                    <span className="font-black text-green-600 text-base">₦9,000 (90%)</span>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-700">
                  💡 Payouts are processed weekly. Minimum payout threshold is ₦5,000. Payments go directly to your registered bank account.
                </div>
              </div>

              {/* Order history table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-black text-gray-900">Order History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Order #','Date','Subtotal','Fee (10%)','You Get','Status'].map(h=>(
                          <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.filter(o=>o.status==='delivered').map(o=>(
                        <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-gray-700">{o.order_number}</td>
                          <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-semibold">₦{o.subtotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-600 font-semibold">−₦{o.platform_fee.toLocaleString()}</td>
                          <td className="px-4 py-3 text-green-600 font-black">₦{o.vendor_payout.toLocaleString()}</td>
                          <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[o.status]}`}>{o.status}</span></td>
                        </tr>
                      ))}
                      {orders.filter(o=>o.status==='delivered').length===0&&(
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No delivered orders yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
