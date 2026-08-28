'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Package, CheckCircle,
  Truck, Flag, Loader2, Clock, User
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus, Rider } from '@/types';

type RiderStatus = Extract<OrderStatus, 'picked_up' | 'on_the_way' | 'delivered'>;

const STATUS_FLOW: { status: RiderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'picked_up',  label: 'Picked Up',  icon: <Package className="w-5 h-5" />,     color: 'from-amber-500 to-orange-500' },
  { status: 'on_the_way', label: 'On the Way', icon: <Truck className="w-5 h-5" />,        color: 'from-cyan-500 to-blue-500' },
  { status: 'delivered',  label: 'Delivered',  icon: <CheckCircle className="w-5 h-5" />,  color: 'from-green-500 to-emerald-500' },
];

const STATUS_NEXT: Partial<Record<RiderStatus, RiderStatus>> = {
  picked_up:  'on_the_way',
  on_the_way: 'delivered',
};

const STATUS_NEXT_LABEL: Partial<Record<RiderStatus, string>> = {
  picked_up:  'Mark as On the Way',
  on_the_way: 'Mark as Delivered',
};

export default function RiderOrderDetail() {
  const router  = useRouter();
  const params  = useParams();
  const orderId = params.id as string;
  const { user, isLoggedIn, loading: al } = useAuth();

  const [order,   setOrder]   = useState<Order | null>(null);
  const [rider,   setRider]   = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (al) return;
    if (!isLoggedIn) { router.replace('/rider/login'); return; }
  }, [al, isLoggedIn, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, orderId]);

  async function fetchData() {
    setLoading(true);
    const { data: r } = await supabase.from('riders').select('*').eq('user_id', user!.id).maybeSingle();
    if (!r) { router.replace('/rider/signup'); return; }
    setRider(r);

    const { data: o } = await supabase
      .from('orders')
      .select('*, stores(name, logo_url, phone, category), order_items(*), profiles(full_name, phone)')
      .eq('id', orderId)
      .maybeSingle();

    if (!o || (o.rider_id !== r.id && !(o.status === 'ready' && !o.rider_id))) {
      router.replace('/rider/dashboard'); return;
    }
    setOrder(o);
    setLoading(false);
  }

async function updateStatus(next: RiderStatus) {
  if (!order || !rider) return;
  setUpdating(true);
  const updates: Partial<Order> & { total_deliveries?: number } = { status: next };

  const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
  if (!error) {
    setOrder(o => o ? { ...o, status: next } : o);

    fetch('/api/notify-vendor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'order_status', orderId: order.id, status: next }),
    }).catch(err => console.warn('Customer status notification failed:', err));

    if (next === 'delivered') {
      await supabase.from('riders')
        .update({ total_deliveries: rider.total_deliveries + 1 })
        .eq('id', rider.id);
      setRider(r => r ? { ...r, total_deliveries: r.total_deliveries + 1 } : r);
    }
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

  const currentStatusIndex = STATUS_FLOW.findIndex(s => s.status === order.status);
  const nextStatus = STATUS_NEXT[order.status as RiderStatus];
  const isDelivered = order.status === 'delivered';

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
        {/* Status progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-black text-gray-900 mb-4">Delivery Status</h3>
          <div className="space-y-3">
            {STATUS_FLOW.map((s, i) => {
              const done    = i < currentStatusIndex;
              const current = i === currentStatusIndex;
              return (
                <div key={s.status} className="flex items-center gap-3">
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

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-gray-900">Delivery Address</h3>
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
                <div className="text-sm font-bold text-gray-900">{order.profiles?.full_name ?? 'Customer'}</div>
                <div className="text-xs text-gray-400">{order.customer_phone}</div>
              </div>
            </div>
            <a href={`tel:${order.customer_phone}`}
              className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors">
              <Phone className="w-4 h-4" />
            </a>
          </div>

          {/* Store contact */}
          {order.stores?.phone && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-bold text-gray-900">{order.stores.name}</div>
                  <div className="text-xs text-gray-400">Store</div>
                </div>
              </div>
              <a href={`tel:${order.stores.phone}`}
                className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                <Phone className="w-4 h-4" />
              </a>
            </div>
          )}
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
            {order.payment_method === 'cash_on_delivery' && ' — collect cash on delivery'}
          </p>
        </div>

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
              : <><Flag className="w-5 h-5" /> {STATUS_NEXT_LABEL[order.status as RiderStatus]}</>
            }
          </motion.button>
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
    </div>
  );
}