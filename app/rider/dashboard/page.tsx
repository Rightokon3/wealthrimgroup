'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike, MapPin, Package, Clock, CheckCircle, History,
  LogOut, ToggleLeft, ToggleRight, ChevronRight, Loader2, Bell
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Rider, Order, OrderStatus } from '@/types';

const STATUS_STYLE: Partial<Record<OrderStatus, string>> = {
  ready:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  picked_up:  'bg-amber-100 text-amber-700 border-amber-200',
  on_the_way: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered:  'bg-green-100 text-green-700 border-green-200',
};

type Tab = 'available' | 'active' | 'history';

function formatSince(iso: string | null | undefined) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function RiderDashboard() {
  const router = useRouter();
  const { user, isLoggedIn, loading: al, signOut } = useAuth();

  const [rider,     setRider]     = useState<Rider | null>(null);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [tab,       setTab]       = useState<Tab>('available');
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState(false);
  const [toggleErr, setToggleErr] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);

  // Auth guard — matches vendor dashboard pattern exactly
  useEffect(() => {
    if (al) return;
    if (!isLoggedIn) { router.replace('/rider/login'); return; }
  }, [al, isLoggedIn, router]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    // Verify rider profile exists
    const { data: r } = await supabase
      .from('riders')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!r) { router.replace('/rider/signup'); return; }
    setRider(r);

    await fetchOrders(r.id);
    setLoading(false);
  }

  async function fetchOrders(riderId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*, stores(name, logo_url, phone, category), order_items(*)')
      .or(`and(status.eq.ready,rider_id.is.null),rider_id.eq.${riderId}`)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
  }

  async function toggleOnline() {
    if (!rider) return;
    setToggling(true);
    setToggleErr('');
    const next = !rider.is_online;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('riders')
      .update({ is_online: next, last_status_change: now })
      .eq('id', rider.id);

    if (error) {
      setToggleErr('Could not update status. Try again.');
      setToggling(false);
      return;
    }

    setRider(r => r ? { ...r, is_online: next, last_status_change: now } : r);
    setToggling(false);
  }

  async function acceptOrder(orderId: string) {
    if (!rider) return;
    setAccepting(orderId);
    // Atomic: only update if rider_id is still null (race condition guard)
    const { error } = await supabase
      .from('orders')
      .update({ rider_id: rider.id, status: 'picked_up' })
      .eq('id', orderId)
      .eq('status', 'ready')
      .is('rider_id', null);

    if (error) {
      alert('This order was just taken by another rider. Refreshing...');
    }
    await fetchOrders(rider.id);
    setAccepting(null);
    // Navigate to the order detail
    if (!error) router.push(`/rider/orders/${orderId}`);
  }

  if (al || (isLoggedIn && !rider && loading)) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const availableOrders = orders.filter(o => o.status === 'ready' && o.rider_id === null);
  const activeOrders    = orders.filter(o => o.rider_id === rider?.id && ['picked_up','on_the_way'].includes(o.status));
  const historyOrders   = orders.filter(o => o.rider_id === rider?.id && o.status === 'delivered');

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'available', label: 'Available',  count: availableOrders.length },
    { id: 'active',    label: 'Active',     count: activeOrders.length },
    { id: 'history',   label: 'History' },
  ];

  const sinceLabel = formatSince(rider?.last_status_change);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-gray-950 text-white sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-sm">{rider?.full_name}</div>
              <div className="text-xs text-gray-400 capitalize">{rider?.vehicle_type} · {rider?.total_deliveries} deliveries</div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Online toggle */}
            <button
              onClick={toggleOnline} disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                rider?.is_online
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {toggling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : rider?.is_online
                  ? <><ToggleRight className="w-4 h-4" /> Online</>
                  : <><ToggleLeft className="w-4 h-4" /> Offline</>
              }
            </button>
            {sinceLabel && !toggling && (
              <span className="text-[11px] text-gray-500">
                {rider?.is_online ? 'Online' : 'Offline'} for {sinceLabel}
              </span>
            )}
          </div>
        </div>
        {toggleErr && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <p className="text-xs text-red-400 font-medium">{toggleErr}</p>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Available', value: availableOrders.length, color: 'from-indigo-500 to-blue-500' },
            { label: 'Active',    value: activeOrders.length,    color: 'from-amber-500 to-orange-500' },
            { label: 'Delivered', value: historyOrders.length,   color: 'from-green-500 to-emerald-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Offline notice */}
        {!rider?.is_online && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Bell className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium">You're offline. Go online to see and accept orders.</p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-white rounded-2xl h-28 border border-gray-100" />)}
            </div>
          ) : (
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">

              {/* ── AVAILABLE ORDERS ── */}
              {tab === 'available' && (
                <>
                  {availableOrders.length === 0 ? (
                    <EmptyState icon={<Package className="w-10 h-10 text-gray-200" />}
                      title={rider?.is_online ? 'No orders available' : 'Go online to see orders'}
                      sub={rider?.is_online ? 'New orders will appear here automatically.' : 'Toggle online above to start receiving orders.'} />
                  ) : availableOrders.map(order => (
                    <OrderCard key={order.id} order={order} action={
                      <button
                        onClick={() => acceptOrder(order.id)}
                        disabled={accepting === order.id || !rider?.is_online}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 text-sm"
                      >
                        {accepting === order.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><CheckCircle className="w-4 h-4" /> Accept & Pick Up</>
                        }
                      </button>
                    } />
                  ))}
                </>
              )}

              {/* ── ACTIVE ORDERS ── */}
              {tab === 'active' && (
                <>
                  {activeOrders.length === 0 ? (
                    <EmptyState icon={<Bike className="w-10 h-10 text-gray-200" />}
                      title="No active deliveries" sub="Accept an order from the Available tab to start." />
                  ) : activeOrders.map(order => (
                    <OrderCard key={order.id} order={order} action={
                      <Link href={`/rider/orders/${order.id}`}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" /> Manage Delivery <ChevronRight className="w-4 h-4" />
                      </Link>
                    } />
                  ))}
                </>
              )}

              {/* ── HISTORY ── */}
              {tab === 'history' && (
                <>
                  {historyOrders.length === 0 ? (
                    <EmptyState icon={<History className="w-10 h-10 text-gray-200" />}
                      title="No deliveries yet" sub="Completed deliveries will show here." />
                  ) : historyOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-gray-900 text-sm">{order.order_number}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {order.delivery_address}
                          </div>
                          <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-green-100 text-green-700 border-green-200">
                          Delivered ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign out */}
        <button
          onClick={async () => { await signOut(); router.push('/'); }}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-red-500 font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────
function OrderCard({ order, action }: { order: Order; action: React.ReactNode }) {
  const store = order.stores;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {store?.logo_url
            ? <img src={store.logo_url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
            : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-black flex-shrink-0">
                {store?.name?.charAt(0)}
              </div>
          }
          <div>
            <div className="font-black text-gray-900 text-sm">{store?.name}</div>
            <div className="text-xs text-gray-400 font-mono">{order.order_number}</div>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
          STATUS_STYLE[order.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
        }`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{order.delivery_address}, {order.delivery_city}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="ml-auto font-black text-gray-900">₦{order.delivery_fee.toLocaleString()} fee</span>
        </div>
      </div>

      {order.order_items && order.order_items.length > 0 && (
        <div className="text-xs text-gray-500">
          {order.order_items.slice(0, 2).map((item, i) => (
            <span key={i}>{item.quantity}× {item.name}{i < Math.min(order.order_items!.length, 2) - 1 ? ', ' : ''}</span>
          ))}
          {order.order_items.length > 2 && <span className="text-gray-400"> +{order.order_items.length - 2} more</span>}
        </div>
      )}

      {action}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-black text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{sub}</p>
    </div>
  );
}