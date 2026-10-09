'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Package, CheckCircle,
  Truck, Flag, Loader2, Clock, User, Navigation, Store as StoreIcon, AlertCircle, ChefHat
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus, Rider } from '@/types';
import type { NavTarget } from '@/components/rider/LiveNavigation';
import { useShareRiderLocation } from '@/lib/useShareRiderLocation';

// Leaflet needs the browser, so the navigation view is loaded client-side only.
const LiveNavigation = dynamic(() => import('@/components/rider/LiveNavigation'), { ssr: false });

type RiderStep = Extract<OrderStatus, 'ready' | 'picked_up' | 'on_the_way' | 'delivered'>;

// The full journey of a delivery. `match` = order statuses that belong to that stage.
const STATUS_FLOW: { key: string; match: string[]; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'preparing',  match: ['pending', 'confirmed', 'preparing'], label: 'Vendor preparing',  icon: <ChefHat className="w-5 h-5" />,     color: 'from-purple-500 to-indigo-500' },
  { key: 'ready',      match: ['ready'],                             label: 'Ready for pickup',  icon: <Package className="w-5 h-5" />,     color: 'from-indigo-500 to-blue-500' },
  { key: 'picked_up',  match: ['picked_up'],                         label: 'Picked up',         icon: <Package className="w-5 h-5" />,     color: 'from-amber-500 to-orange-500' },
  { key: 'on_the_way', match: ['on_the_way'],                        label: 'On the way',        icon: <Truck className="w-5 h-5" />,       color: 'from-cyan-500 to-blue-500' },
  { key: 'delivered',  match: ['delivered'],                         label: 'Delivered',         icon: <CheckCircle className="w-5 h-5" />, color: 'from-green-500 to-emerald-500' },
];

// What the rider can do next from each status. Before "ready" the rider can only wait.
const STATUS_NEXT: Partial<Record<string, RiderStep>> = {
  ready:      'picked_up',
  picked_up:  'on_the_way',
  on_the_way: 'delivered',
};

const STATUS_NEXT_LABEL: Partial<Record<string, string>> = {
  ready:      'Confirm Pickup',
  picked_up:  'Mark as On the Way',
  on_the_way: 'Mark as Delivered',
};

const PRE_READY = ['pending', 'confirmed', 'preparing'];

export default function RiderOrderDetail() {
  const router  = useRouter();
  const params  = useParams();
  const orderId = params.id as string;
  const { user, isLoggedIn, loading: al } = useAuth();

  const [order,     setOrder]     = useState<Order | null>(null);
  const [rider,     setRider]     = useState<Rider | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(false);
  const [err,       setErr]       = useState('');
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);

  // Share the rider's live position with the customer while this order is out for delivery
  useShareRiderLocation(
    order && ['picked_up', 'on_the_way'].includes(order.status) ? [order.id] : [],
    !navTarget
  );

  useEffect(() => {
    if (al) return;
    if (!isLoggedIn) { router.replace('/rider/login'); return; }
  }, [al, isLoggedIn, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, orderId]);

  // While the vendor is still preparing, keep the status fresh (every 10s)
  useEffect(() => {
    if (!rider || !order || order.status === 'delivered') return;
    const t = setInterval(async () => {
      const o = await loadOrder();
      if (!o || o.rider_id !== rider.id) { router.replace('/rider/dashboard'); return; }
      setOrder(o);
    }, 10000);
    return () => clearInterval(t);
  }, [rider?.id, order?.status]);

  async function loadOrder(): Promise<Order | null> {
    const { data: o } = await supabase
      .from('orders')
      .select('*, stores(name, logo_url, phone, category, address, city, latitude, longitude), order_items(*), profiles(full_name, phone)')
      .eq('id', orderId)
      .maybeSingle();
    if (o) return o as Order;

    // Fallback: the secure rider function (works even if direct table access is restricted)
    const { data: list } = await supabase.rpc('get_rider_orders');
    return ((list ?? []) as Order[]).find(x => x.id === orderId) ?? null;
  }

  async function fetchData() {
    setLoading(true);
    const { data: r } = await supabase.from('riders').select('*').eq('user_id', user!.id).maybeSingle();
    if (!r) { router.replace('/rider/signup'); return; }
    setRider(r);

    const o = await loadOrder();
    // Riders can only manage orders they have accepted (accepting happens on the dashboard)
    if (!o || o.rider_id !== r.id) {
      router.replace('/rider/dashboard'); return;
    }
    setOrder(o);
    setLoading(false);
  }

  async function releaseOrder() {
    if (!order || !rider) return;
    const ok = window.confirm(
      'Cancel this delivery? The customer keeps their order and we will find them another rider. ' +
      'Cancelling often can affect your account.'
    );
    if (!ok) return;
    const reason = window.prompt('Why are you cancelling? (optional)') ?? '';

    setUpdating(true); setErr('');
    const { data, error } = await supabase.rpc('rider_release_order', { p_order_id: order.id, p_reason: reason });
    if (error || data !== 'ok') {
      setErr(data === 'too_late'
        ? 'This order is already out for delivery, so it cannot be cancelled here. Please contact support.'
        : (error?.message ?? 'Could not cancel this delivery. Please try again.'));
      setUpdating(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    fetch('/api/orders/rider-released', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(e => console.warn('Rider-cancel notification failed:', e));
    router.replace('/rider/dashboard');
  }

  async function updateStatus(next: RiderStep) {
    if (!order || !rider) return;

    if (next === 'delivered' && order.payment_method === 'cash_on_delivery') {
      const ok = window.confirm(`Have you collected ₦${order.total.toLocaleString()} cash from the customer?`);
      if (!ok) return;
    }

    setUpdating(true);
    setErr('');

    // .eq('rider_id') makes sure only the assigned rider can move this order,
    // and .select() lets us detect an update that was silently blocked.
    const { data, error } = await supabase
      .from('orders')
      .update({ status: next })
      .eq('id', order.id)
      .eq('rider_id', rider.id)
      .select('id');

    if (error || !data || data.length === 0) {
      setErr(error?.message ?? 'Could not update this order. Please try again.');
      setUpdating(false);
      return;
    }

    setOrder(o => o ? { ...o, status: next } : o);

    fetch('/api/notify-vendor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order_status', orderId: order.id, status: next }),
    }).catch(e => console.warn('Customer status notification failed:', e));

    if (next === 'delivered') {
      await supabase.from('riders')
        .update({ total_deliveries: rider.total_deliveries + 1 })
        .eq('id', rider.id);
      setRider(r => r ? { ...r, total_deliveries: r.total_deliveries + 1 } : r);
    }

    setUpdating(false);
    if (next === 'delivered') {
      setTimeout(() => router.replace('/rider/dashboard'), 1500);
    }
  }

  if (loading || al) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return null;

  const o = order as any;
  const store = order.stores as any;

  const currentIndex = STATUS_FLOW.findIndex(s => s.match.includes(order.status));
  const nextStatus   = STATUS_NEXT[order.status];
  const isDelivered  = order.status === 'delivered';
  const waitingForVendor = PRE_READY.includes(order.status);
  const afterPickup  = ['picked_up', 'on_the_way', 'delivered'].includes(order.status);

  const storePin = store?.latitude != null && store?.longitude != null
    ? { lat: Number(store.latitude), lng: Number(store.longitude) } : null;
  const customerPin = o.delivery_latitude != null && o.delivery_longitude != null
    ? { lat: Number(o.delivery_latitude), lng: Number(o.delivery_longitude) } : null;

  const customerName = order.profiles?.full_name ?? 'Customer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-950 text-white sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/rider/dashboard"
            className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="font-black text-sm">{order.order_number}</div>
            <div className="text-xs text-gray-400 capitalize">{order.status.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Waiting-for-vendor notice */}
        {waitingForVendor && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-start gap-3">
            <ChefHat className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-purple-800">The vendor is still preparing this order</p>
              <p className="text-xs text-purple-700 mt-0.5">Head to the store now. "Confirm Pickup" unlocks as soon as the vendor marks it ready.</p>
            </div>
          </div>
        )}

        {/* Status progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-black text-gray-900 mb-4">Delivery Status</h3>
          <div className="space-y-3">
            {STATUS_FLOW.map((s, i) => {
              const done    = i < currentIndex;
              const current = i === currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    done    ? 'bg-green-100 text-green-600' :
                    current ? `bg-gradient-to-br ${s.color} text-white shadow-md` :
                              'bg-gray-100 text-gray-300'
                  }`}>
                    {done ? <CheckCircle className="w-5 h-5" /> : s.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${current ? 'text-gray-900' : done ? 'text-green-600' : 'text-gray-300'}`}>
                      {s.label}
                    </div>
                  </div>
                  {current && <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Current</span>}
                  {done    && <span className="text-xs text-green-500">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        {!isDelivered && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-black text-gray-900">Navigate</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!storePin}
                onClick={() => storePin && setNavTarget({ ...storePin, label: store?.name ?? 'the store', orderId: order.id })}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-40 ${
                  !afterPickup
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-100'
                    : 'border border-orange-200 text-orange-600 hover:bg-orange-50'
                }`}>
                <Navigation className="w-4 h-4" /> To store
              </button>
              <button
                type="button"
                disabled={!customerPin}
                onClick={() => customerPin && setNavTarget({ ...customerPin, label: customerName, orderId: order.id })}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-40 ${
                  afterPickup
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-100'
                    : 'border border-green-200 text-green-700 hover:bg-green-50'
                }`}>
                <Navigation className="w-4 h-4" /> To customer
              </button>
            </div>
            {(!storePin || !customerPin) && (
              <p className="text-xs text-amber-600 font-medium">
                {!storePin && !customerPin
                  ? 'No map pins were saved for this order. Use the addresses below.'
                  : !storePin
                    ? 'The store has no map pin yet. Use the store address below.'
                    : 'The customer did not pin their location. Use the delivery address below or call them.'}
              </p>
            )}
          </div>
        )}

        {/* Pickup */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-gray-900">Pick Up From</h3>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <StoreIcon className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900 text-sm">{store?.name}</div>
              <div className="text-xs text-gray-400">{[store?.address, store?.city].filter(Boolean).join(', ') || 'Address not provided'}</div>
            </div>
          </div>
          {store?.phone && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-bold text-gray-900">{store.name}</div>
                  <div className="text-xs text-gray-400">Call the store</div>
                </div>
              </div>
              <a href={`tel:${store.phone}`}
                className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                <Phone className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-gray-900">Deliver To</h3>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900 text-sm">{order.delivery_address}</div>
              <div className="text-xs text-gray-400">{order.delivery_city}{order.delivery_state ? `, ${order.delivery_state}` : ''}</div>
              {order.delivery_note && (
                <div className="text-xs text-amber-600 mt-1 font-medium">📝 {order.delivery_note}</div>
              )}
            </div>
          </div>

          {/* Customer contact */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-sm font-bold text-gray-900">{customerName}</div>
                <div className="text-xs text-gray-400">{order.customer_phone}</div>
              </div>
            </div>
            <a href={`tel:${order.customer_phone}`}
              className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors">
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Order items */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-900 mb-3">Items to Deliver</h3>
            <div className="space-y-2">
              {order.order_items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-700">{item.quantity}× {item.name}</span>
                  <span className="font-bold text-gray-900">₦{item.subtotal.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-sm font-black">
                <span>Total</span>
                <span className="text-green-600">₦{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment method note */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Payment: <span className="font-black capitalize">{order.payment_method.replace(/_/g, ' ')}</span>
            {order.payment_method === 'cash_on_delivery' && ` — collect ₦${order.total.toLocaleString()} cash on delivery`}
          </p>
        </div>

        {err && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm font-medium">{err}</p>
          </div>
        )}

        {/* Action button */}
        {!isDelivered && nextStatus && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => updateStatus(nextStatus)}
            disabled={updating}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 text-base hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 shadow-lg shadow-green-200"
          >
            {updating
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Flag className="w-5 h-5" /> {STATUS_NEXT_LABEL[order.status]}</>
            }
          </motion.button>
        )}

        {/* Rider can hand the order back until it is out for delivery */}
        {['pending', 'confirmed', 'preparing', 'ready', 'picked_up'].includes(order.status) && (
          <button
            onClick={releaseOrder}
            disabled={updating}
            className="w-full py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-2xl text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Cancel this delivery
          </button>
        )}

        {/* Locked button while the vendor is still preparing */}
        {waitingForVendor && (
          <button disabled
            className="w-full py-4 bg-gray-200 text-gray-400 font-black rounded-2xl flex items-center justify-center gap-3 text-base cursor-not-allowed">
            <Loader2 className="w-5 h-5 animate-spin" /> Waiting for the vendor...
          </button>
        )}

        {isDelivered && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500 text-white rounded-2xl p-5 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2" />
            <div className="font-black text-lg">Delivered! 🎉</div>
            <div className="text-sm text-green-100 mt-1">Redirecting to dashboard...</div>
          </motion.div>
        )}
      </div>

      {/* Live navigation (OpenStreetMap) */}
      {navTarget && <LiveNavigation target={navTarget} onClose={() => setNavTarget(null)} />}
    </div>
  );
}