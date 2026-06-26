'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, CheckCircle, XCircle, Truck, Package, MapPin, Phone, ChevronDown, ChevronUp, Star } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Order, OrderStatus, CATEGORY_META } from '@/types';

const STATUS_STEPS: OrderStatus[] = ['pending','confirmed','preparing','ready','on_the_way','delivered'];

const STATUS_META: Record<OrderStatus,{label:string;icon:React.ReactNode;color:string}> = {
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

  useEffect(() => {
    if (!al && !isLoggedIn) router.replace('/auth/login?next=/orders');
    if (user) fetchOrders();
  },[al,isLoggedIn,user]);

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

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
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
          const isActive= ['pending','confirmed','preparing','ready','on_the_way'].includes(order.status);
          const stepIdx = STATUS_STEPS.indexOf(order.status);
          const isOpen  = expanded===order.id;

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

                {/* Progress bar for active orders */}
                {isActive && order.status!=='cancelled' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      {STATUS_STEPS.slice(0,5).map((s,i)=>(
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
