'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Clock, CheckCircle, XCircle, Truck, Package, MapPin, Phone, ChevronDown, ChevronUp, Star, Navigation, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus, CATEGORY_META } from '@/types';

// The 5 dots of the progress bar
const STATUS_STEPS: OrderStatus[] = ['pending','confirmed','preparing','ready','on_the_way'];

// Which dot an order is on (picked_up sits between "ready" and "on the way")
const PROGRESS: Partial<Record<OrderStatus, number>> = {
  pending: 0, confirmed: 1, preparing: 2, ready: 3, picked_up: 4, on_the_way: 4,
};

// Statuses where the rider has the order and can be tracked
const TRACKABLE: string[] = ['picked_up', 'on_the_way'];

const STATUS_META: Record<OrderStatus,{label:string;icon:React.ReactNode;color:string}> = {
  picked_up:  { label:'Picked Up',    icon:<CheckCircle className="w-4 h-4"/>,  color:'bg-green-100 text-green-700 border-green-200' },
  pending:    { label:'Pending',      icon:<Clock className="w-4 h-4"/>,        color:'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed:  { label:'Confirmed',    icon:<CheckCircle className="w-4 h-4"/>,  color:'bg-blue-100 text-blue-700 border-blue-200' },
  preparing:  { label:'Preparing',    icon:<Package className="w-4 h-4"/>,      color:'bg-purple-100 text-purple-700 border-purple-200' },
  ready:      { label:'Ready',        icon:<CheckCircle className="w-4 h-4"/>,  color:'bg-indigo-100 text-indigo-700 border-indigo-200' },
  on_the_way: { label:'On the Way',   icon:<Truck className="w-4 h-4"/>,        color:'bg-cyan-100 text-cyan-700 border-cyan-200' },
  delivered:  { label:'Delivered',    icon:<CheckCircle className="w-4 h-4"/>,  color:'bg-green-100 text-green-700 border-green-200' },
  cancelled:  { label:'Cancelled',    icon:<XCircle className="w-4 h-4"/>,      color:'bg-red-100 text-red-700 border-red-200' },
  refunded:   { label:'Refunded',     icon:<XCircle className="w-4 h-4"/>,      color:'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoggedIn, loading:al } = useAuth();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded,setExpanded]= useState<string|null>(null);
  const [reviewed,setReviewed]= useState<string[]>([]);
  const [trackPromptId, setTrackPromptId] = useState<string|null>(null);
  const prompted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!al && !isLoggedIn) router.replace('/auth/login?next=/orders');
    if (user) fetchOrders();
  },[al,isLoggedIn,user]);

  // Live order updates. The moment a rider picks an order up we ask the customer
  // "Would you like to track it?"
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
        payload => {
          const row = payload.new as any;
          setOrders(prev => prev.map(o => o.id === row.id ? { ...o, status: row.status, rider_id: row.rider_id, rider_released_at: row.rider_released_at, refund_status: row.refund_status, refund_amount: row.refund_amount, cancel_reason: row.cancel_reason, cancelled_by: row.cancelled_by } as Order : o));

          if (TRACKABLE.includes(row.status) && row.delivery_type === 'delivery' && !prompted.current.has(row.id)) {
            prompted.current.add(row.id);
            setTrackPromptId(row.id);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, stores(name,logo_url,phone,category), order_items(*)')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending:false });
    setOrders(data ?? []);
    setLoading(false);
  }

  async function leaveReview(storeId:string, orderId:string, rating:number, comment:string) {
    await supabase.from('reviews').upsert([{
      store_id:storeId, customer_id:user!.id, order_id:orderId, rating, comment
    }],{ onConflict:'customer_id,store_id' });
    setReviewed(p=>[...p,orderId]);
  }

  if (al) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  const promptOrder = trackPromptId ? orders.find(o => o.id === trackPromptId) : null;

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* "Your order is on the way. Track it?" popup */}
      <AnimatePresence>
        {promptOrder && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setTrackPromptId(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}}
              className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <button onClick={()=>setTrackPromptId(null)} aria-label="Close"
                className="absolute top-4 right-4 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4"/>
              </button>
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-blue-600"/>
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Your order is on its way! 🚴</h3>
              <p className="text-gray-500 text-sm mb-5">
                {promptOrder.stores?.name ? `${promptOrder.stores.name}'s` : 'Your'} order <span className="font-mono font-bold">{promptOrder.order_number}</span> has been sent out for delivery. Would you like to track your rider live?
              </p>
              <div className="flex gap-3">
                <button onClick={()=>setTrackPromptId(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                  Not now
                </button>
                <Link href={`/orders/${promptOrder.id}/track`} onClick={()=>setTrackPromptId(null)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-700">
                  <Navigation className="w-4 h-4"/> Yes, track it
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-10">
        <div className="max-w-[800px] mx-auto px-6">
          <h1 className="text-3xl font-black mb-1">My Orders</h1>
          <p className="text-orange-100 text-sm">{orders.length} order{orders.length!==1?'s':''} total</p>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 py-8 space-y-4">
        {loading ? (
          [1,2,3].map(i=><div key={i} className="animate-pulse bg-white rounded-2xl h-28 border border-gray-100"/>)
        ) : orders.length===0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <ShoppingCart className="w-14 h-14 text-gray-200 mx-auto mb-4"/>
            <h3 className="font-black text-gray-700 mb-2">No orders yet</h3>
            <p className="text-gray-400 text-sm mb-5">Browse our stores and place your first order.</p>
            <Link href="/" className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600">Browse Stores</Link>
          </div>
        ) : orders.map(order=>{
          const meta    = order.stores ? CATEGORY_META[order.stores.category ] : null;
          const statusM = STATUS_META[order.status];
          const isActive= ['pending','confirmed','preparing','ready','picked_up','on_the_way'].includes(order.status);
          const stepIdx = PROGRESS[order.status] ?? 0;
          const isOpen  = expanded===order.id;
          const canTrack = TRACKABLE.includes(order.status) && (order as any).delivery_type !== 'viewing';

          return (
            <motion.div key={order.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Order header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    {order.stores?.logo_url
                      ? <img src={order.stores.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-gray-100 flex-shrink-0"/>
                      : <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">{meta?.icon??'🛍'}</div>
                    }
                    <div>
                      <p className="font-black text-gray-900">{order.stores?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{order.order_number}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-gray-900">₦{order.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${statusM.color}`}>
                    {statusM.icon}{statusM.label}
                  </span>
                  <button onClick={()=>setExpanded(isOpen?null:order.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 font-semibold hover:text-orange-600 transition-colors">
                    {isOpen?<><ChevronUp className="w-3.5 h-3.5"/>Less</>:<><ChevronDown className="w-3.5 h-3.5"/>Details</>}
                  </button>
                </div>

                {/* Track Delivery: appears as soon as the rider has picked the order up */}
                {canTrack && (
                  <Link href={`/orders/${order.id}/track`}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-100">
                    <Navigation className="w-4 h-4"/> Track Delivery
                  </Link>
                )}

                {/* Progress bar for active orders */}
                {isActive && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      {STATUS_STEPS.map((s,i)=>(
                        <div key={s} className="flex items-center flex-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black transition-all ${i<=stepIdx?'bg-orange-500 text-white':'bg-gray-200 text-gray-400'}`}>
                            {i<stepIdx?'✓':i+1}
                          </div>
                          {i<4&&<div className={`flex-1 h-1 mx-1 rounded-full ${i<stepIdx?'bg-orange-500':'bg-gray-200'}`}/>}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-orange-600 font-semibold text-center">{statusM.label}...</p>
                  </div>
                )}
              </div>

              {(() => {
                const o: any = order;
                const searching = isActive && !o.rider_id && !!o.rider_released_at && o.delivery_type==='delivery';
                if (!searching) return null;
                return (
                  <div className="mx-5 mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                    <p className="font-bold">Your rider had to cancel. We are finding you a new one.</p>
                    <p className="text-xs mt-1 opacity-80">Your order is still on. You do not need to do anything. This page updates by itself when a new rider accepts.</p>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Cancel this order? If you paid online, the full amount including delivery will be refunded.')) return;
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch('/api/orders/cancel', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
                          body: JSON.stringify({ orderId: order.id, reason: 'Customer cancelled while waiting for a new rider' }),
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok) { alert(j.error ?? 'Could not cancel. Try again.'); return; }
                        window.location.reload();
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-white border border-orange-300 text-orange-700 text-xs font-bold hover:bg-orange-100">
                      Cancel order and get a full refund
                    </button>
                  </div>
                );
              })()}

              {order.status==='cancelled' && (() => {
                const o: any = order;
                const paid = o.refund_amount != null;
                const bad = ['failed','needs_attention'].includes(o.refund_status);
                const done = o.refund_status==='processed';
                return (
                  <div className={`mx-5 mb-5 rounded-xl border p-4 text-sm ${!paid ? 'bg-gray-50 border-gray-200 text-gray-700' : bad ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    <p className="font-bold">
                      {!paid ? 'This order was cancelled. You were not charged.'
                        : bad ? `This order was cancelled. Your ₦${Number(o.refund_amount).toLocaleString()} refund is being arranged by our team.`
                        : done ? `Your order was cancelled and ₦${Number(o.refund_amount).toLocaleString()} has been refunded to you.`
                        : `Your order was cancelled and we have refunded ₦${Number(o.refund_amount).toLocaleString()} back to you.`}
                    </p>
                    {paid && !bad && <p className="text-xs mt-1 opacity-80">The full amount, including delivery, goes back to the card or bank account you paid with. It can take a few working days to show.</p>}
                    {o.cancel_reason && <p className="text-xs mt-1 opacity-80">Reason: {o.cancel_reason}</p>}
                  </div>
                );
              })()}

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  {/* Items */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                    <div className="space-y-2">
                      {order.order_items?.map(item=>(
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {item.image_url&&<img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100"/>}
                            <span className="text-gray-700">{item.quantity}× {item.name}</span>
                            {item.selected_size&&<span className="text-xs text-gray-400">({item.selected_size})</span>}
                          </div>
                          <span className="font-bold text-gray-900">₦{item.subtotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₦{order.subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-orange-600"><span>Platform fee (10%)</span><span>₦{order.platform_fee.toLocaleString()}</span></div>
                    {order.delivery_fee>0&&<div className="flex justify-between text-gray-500"><span>Delivery</span><span>₦{order.delivery_fee.toLocaleString()}</span></div>}
                    <div className="flex justify-between font-black text-gray-900 pt-1.5 border-t border-gray-200"><span>Total</span><span>₦{order.total.toLocaleString()}</span></div>
                  </div>

                  {/* Delivery info */}
                  <div className="text-sm space-y-1.5 text-gray-500">
                    {order.delivery_address&&<div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5"/><span>{order.delivery_address}, {order.delivery_city}</span></div>}
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500"/><span>{order.customer_phone}</span></div>
                    {order.delivery_note&&<div className="flex items-start gap-2 text-xs italic text-gray-400"><span>Note: {order.delivery_note}</span></div>}
                  </div>

                  {/* Review form for delivered orders */}
                  {order.status==='delivered' && !reviewed.includes(order.id) && (
                    <ReviewForm
                      orderId={order.id}
                      storeId={order.store_id}
                      storeName={order.stores?.name??''}
                      onSubmit={(rating,comment)=>leaveReview(order.store_id,order.id,rating,comment)}
                    />
                  )}
                  {reviewed.includes(order.id)&&(
                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold p-3 bg-green-50 rounded-xl">
                      <CheckCircle className="w-4 h-4"/>Review submitted. Thank you!
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewForm({ orderId, storeId, storeName, onSubmit }:{
  orderId:string; storeId:string; storeName:string;
  onSubmit:(rating:number,comment:string)=>void;
}) {
  const [rating,  setRating]  = useState(5);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    setSaving(true);
    await onSubmit(rating, comment);
    setSaving(false);
  };

  return (
    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
      <p className="text-sm font-black text-gray-900 mb-3">Rate your order from {storeName}</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(s=>(
          <button key={s} type="button" onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(s)}>
            <Star className={`w-7 h-7 transition-colors cursor-pointer ${s<=(hover||rating)?'fill-amber-400 text-amber-400':'text-gray-200 hover:text-amber-300'}`}/>
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Share your experience..."
        className="w-full px-3 py-2 rounded-xl border border-orange-200 text-sm outline-none bg-white resize-none mb-3 focus:border-orange-400"/>
      <button onClick={submit} disabled={saving}
        className="px-5 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-60">
        {saving?'Saving...':'Submit Review'}
      </button>
    </div>
  );
}