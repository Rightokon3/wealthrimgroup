'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, ChevronDown, Eye, X, User, Store, Bike, MapPin, CreditCard, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';

const ALL_STATUSES: OrderStatus[] = [
  'pending','confirmed','preparing','ready',
  'picked_up','on_the_way','delivered','cancelled','refunded'
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:    'bg-amber-900/40 text-amber-400 border-amber-800',
  confirmed:  'bg-blue-900/40 text-blue-400 border-blue-800',
  preparing:  'bg-purple-900/40 text-purple-400 border-purple-800',
  ready:      'bg-indigo-900/40 text-indigo-400 border-indigo-800',
  picked_up:  'bg-orange-900/40 text-orange-400 border-orange-800',
  on_the_way: 'bg-cyan-900/40 text-cyan-400 border-cyan-800',
  delivered:  'bg-green-900/40 text-green-400 border-green-800',
  cancelled:  'bg-red-900/40 text-red-400 border-red-800',
  refunded:   'bg-gray-800 text-gray-500 border-gray-700',
};


const naira = (n: any) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gray-800/50 border border-gray-800 p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wide mb-3"><Icon className="w-4 h-4" /> {title}</div>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-200 font-medium text-right break-words min-w-0">{value}</span>
    </div>
  );
}
function PersonCard({ title, p }: { title: string; p: any }) {
  if (!p) return null;
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-3">
      <div className="text-[11px] font-bold text-gray-500 uppercase mb-1">{title}</div>
      <Row label="Name" value={p.name ?? 'Unknown'} />
      <Row label="Phone" value={p.phone} />
      <Row label="Email" value={p.email} />
      <Row label="Vehicle" value={[p.vehicle, p.plate].filter(Boolean).join(' · ')} />
      <Row label="City" value={p.city} />
      <Row label="Emergency contact" value={p.emergency} />
    </div>
  );
}

function OrderDetailsModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  // Escape closes the window; the page behind stops scrolling while it is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/order-details?id=${orderId}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store',
      });
      const j = await res.json().catch(() => ({}));
      if (stop) return;
      if (!res.ok) setErr(j.error ?? 'Could not load this order.'); else setD(j);
    })();
    return () => { stop = true; };
  }, [orderId]);

  const o = d?.order;
  const items: any[] = o?.order_items ?? [];
  const sameRider = d?.chosenRider && d?.deliveryRider && d.chosenRider.id === d.deliveryRider.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 bg-gray-900 border-b border-gray-800">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 font-bold uppercase">Order details</div>
            <div className="font-black text-white font-mono truncate">{o?.order_number ?? '…'}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!d && !err && <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>}
          {err && <div className="p-4 rounded-xl bg-red-950 border border-red-800 text-red-400 text-sm">{err}</div>}

          {o && (<>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[o.status as OrderStatus] ?? ''}`}>{String(o.status).replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-500">Placed {when(o.created_at)}</span>
            </div>

            {(o.status === 'cancelled' || o.cancel_reason || o.refund_status) && (
              <div className="rounded-2xl bg-red-950/40 border border-red-900 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wide mb-2"><AlertTriangle className="w-4 h-4" /> Cancellation</div>
                <Row label="Cancelled by" value={o.cancelled_by} />
                <Row label="Reason" value={o.cancel_reason} />
                <Row label="When" value={when(o.cancelled_at)} />
                <Row label="Refund" value={o.refund_status ? `${String(o.refund_status).replace(/_/g, ' ')}${o.refund_amount ? ` · ${naira(o.refund_amount)}` : ''}` : null} />
                <Row label="Refund error" value={o.refund_error} />
              </div>
            )}

            <Section icon={User} title="Customer">
              <Row label="Name" value={d.customer.name ?? '—'} />
              <Row label="Phone" value={d.customer.phone} />
              <Row label="Email" value={d.customer.email} />
            </Section>

            <Section icon={Store} title="Store">
              <Row label="Store" value={o.stores?.name} />
              <Row label="Category" value={o.stores?.category} />
              <Row label="Store phone" value={o.stores?.phone} />
            </Section>

            <Section icon={Package} title={`What they ordered (${items.length})`}>
              {items.length === 0 ? <div className="text-sm text-gray-500">No items found.</div> : items.map((it, i) => (
                <div key={it.id ?? i} className="flex justify-between gap-4 py-1.5 text-sm border-b border-gray-800/60 last:border-0">
                  <span className="text-gray-200 min-w-0 break-words">{it.quantity}× {it.name}</span>
                  <span className="text-gray-300 font-bold flex-shrink-0">{naira(it.subtotal ?? Number(it.price ?? it.unit_price ?? 0) * Number(it.quantity ?? 1))}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-800">
                <Row label="Subtotal" value={naira(o.subtotal)} />
                <Row label="Delivery fee" value={o.delivery_fee != null ? naira(o.delivery_fee) : null} />
                <Row label="Drovo commission" value={o.platform_fee != null ? naira(o.platform_fee) : null} />
                <Row label="Vendor gets" value={o.vendor_payout != null ? naira(o.vendor_payout) : null} />
                <div className="flex justify-between pt-2 text-base"><span className="text-gray-400 font-bold">Total</span><span className="text-white font-black">{naira(o.total)}</span></div>
              </div>
            </Section>

            <Section icon={Bike} title="Riders">
              {o.delivery_type && o.delivery_type !== 'delivery' && <div className="text-sm text-gray-400 mb-2">This is a {String(o.delivery_type).replace(/_/g, ' ')} order, so no rider is needed.</div>}
              <div className="space-y-3">
                <PersonCard title="Delivering now" p={d.deliveryRider} />
                {d.chosenRider && !sameRider && <PersonCard title="Chosen by the customer" p={d.chosenRider} />}
                {sameRider && <div className="text-xs text-green-400">This is also the rider the customer chose.</div>}
                {!d.deliveryRider && !d.chosenRider && d.cancelledRiders.length === 0 && <div className="text-sm text-gray-500">No rider has been assigned yet.</div>}
                {!d.deliveryRider && o.rider_released_at && <div className="text-sm text-amber-400">Waiting for a new rider to accept.</div>}
              </div>
              {d.cancelledRiders.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-bold text-red-400 uppercase mb-2">Riders who cancelled ({d.cancelledRiders.length})</div>
                  <div className="space-y-3">
                    {d.cancelledRiders.map((r: any, i: number) => <PersonCard key={r.id ?? i} title={`Cancelled #${i + 1}`} p={r} />)}
                  </div>
                  <div className="mt-3 rounded-xl bg-gray-900 border border-gray-800 p-3">
                    <Row label="Latest cancel reason" value={o.rider_release_reason} />
                    <Row label="Last cancelled" value={when(o.rider_released_at)} />
                    <Row label="Times a rider cancelled" value={o.rider_release_count} />
                  </div>
                </div>
              )}
            </Section>

            <Section icon={MapPin} title="Delivery">
              <Row label="Address" value={o.delivery_address} />
              <Row label="City" value={o.delivery_city} />
              <Row label="Note to rider" value={o.delivery_note} />
              <Row label="Picked up" value={when(o.picked_up_at)} />
              <Row label="Delivered" value={when(o.delivered_at)} />
            </Section>

            <Section icon={CreditCard} title="Payment">
              <Row label="Method" value={o.payment_method ? String(o.payment_method).replace(/_/g, ' ') : null} />
              <Row label="Status" value={o.payment_status} />
              <Row label="Reference" value={o.payment_reference} />
            </Section>
          </>)}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [filtered,   setFiltered]   = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [openId,     setOpenId]     = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.stores?.name?.toLowerCase().includes(q) ||
        o.delivery_city?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [orders, search, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, stores(name, category), profiles(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders(data ?? []);
    setLoading(false);
  }

  async function overrideStatus(orderId: string, next: OrderStatus) {
    setUpdating(orderId);
    await supabase.from('orders').update({ status: next }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o));
    setUpdating(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} orders</p>
        </div>
        <button onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-bold hover:bg-gray-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, store, city..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Customer', 'Store', 'Total', 'Status', 'Date', 'Details', 'Override'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-gray-800 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-600">No orders found.</td></tr>
              ) : filtered.map(o => (
                <motion.tr key={o.id} layout
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300 font-bold whitespace-nowrap">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium text-xs">{o.profiles?.full_name ?? '—'}</div>
                    <div className="text-gray-500 text-xs">{o.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{o.stores?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-black text-white whitespace-nowrap">₦{o.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[o.status]}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setOpenId(o.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={o.status}
                        onChange={e => overrideStatus(o.id, e.target.value as OrderStatus)}
                        disabled={updating === o.id}
                        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs focus:outline-none focus:border-orange-500 disabled:opacity-50 cursor-pointer"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openId && <OrderDetailsModal orderId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}