'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, ShoppingCart, ChevronRight, CreditCard,
  Banknote, Smartphone, CheckCircle, Clock, AlertCircle,
  Minus, Plus, Shield, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { PaymentMethod, CATEGORY_META } from '@/types';
import { Suspense } from 'react';

const DELIVERY_FEES: Record<string,number> = {
  lagos:500,abuja:700,'port harcourt':600,ibadan:550,kano:800,
  accra:1200,nairobi:1500,default:1000
};
function getDeliveryFee(city:string):number {
  return DELIVERY_FEES[city.toLowerCase()]??DELIVERY_FEES.default;
}

function CheckoutInner() {
  const router  = useRouter();
  const { user, profile, isLoggedIn, loading:al } = useAuth();
  const { items, store, subtotal, totalItems, clearCart } = useCart();

  const [address,   setAddress]   = useState('');
  const [city,      setCity]      = useState('');
  const [state,     setState]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [note,      setNote]      = useState('');
  const [scheduled, setScheduled] = useState('');
  const [payment,   setPayment]   = useState<PaymentMethod>('cash_on_delivery');
  const [placing,   setPlacing]   = useState(false);
  const [orderId,   setOrderId]   = useState<string|null>(null);
  const [orderNum,  setOrderNum]  = useState('');
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!al && !isLoggedIn) router.replace('/auth/login?next=/checkout');
  },[al,isLoggedIn,router]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.city)  setCity(profile.city);
  },[profile]);

  const meta        = store ? CATEGORY_META[store.category] : null;
  const isRealEstate= store?.category==='real_estate';
  const deliveryFee = isRealEstate ? 0 : (city ? getDeliveryFee(city) : 1000);
  const platformFee = Math.round(subtotal * 0.10);
  const total       = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (!user||!store) return;
    if (!address.trim()) { setError('Please enter your delivery address.'); return; }
    if (!city.trim())    { setError('Please enter your city.'); return; }
    if (!phone.trim())   { setError('Please enter your phone number.'); return; }
    if (items.length===0){ setError('Your cart is empty.'); return; }

    setPlacing(true); setError('');
    try {
      const { data:order, error:oErr } = await supabase
        .from('orders')
        .insert([{
          customer_id:      user.id,
          store_id:         store.id,
          delivery_type:    isRealEstate ? 'viewing' : 'delivery',
          delivery_address: address,
          delivery_city:    city,
          delivery_state:   state||null,
          customer_phone:   phone,
          delivery_note:    note||null,
          scheduled_at:     scheduled||null,
          subtotal,
          delivery_fee:     deliveryFee,
          // platform_fee and vendor_payout are calculated by DB trigger
          total,
          payment_method:   payment,
          payment_status:   'pending',
        }])
        .select('id, order_number')
        .single();

      if (oErr) throw new Error(oErr.message);

      const orderItems = items.map(i => ({
        order_id:      order.id,
        product_id:    i.product.id,
        name:          i.product.name,
        price:         i.product.price,
        quantity:      i.quantity,
        subtotal:      i.product.price * i.quantity,
        selected_size: i.selected_size??null,
        selected_color:i.selected_color??null,
        image_url:     i.product.image_url??null,
      }));

      const { error:iErr } = await supabase.from('order_items').insert(orderItems);
      if (iErr) throw new Error(iErr.message);

      clearCart();
      setOrderId(order.id);
      setOrderNum(order.order_number);
    } catch(e:any) {
      setError(e.message??'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (al) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  // ── Success ────────────────────────────────────────────────────
  if (orderId) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4">
      <motion.div initial={{scale:.85,opacity:0}} animate={{scale:1,opacity:1}} className="text-center max-w-md w-full">
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:.2,type:'spring',stiffness:200}}
          className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-200">
          <CheckCircle className="w-12 h-12 text-white"/>
        </motion.div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">
          {isRealEstate ? 'Viewing Booked! 🏠' : 'Order Placed! 🎉'}
        </h2>
        <p className="text-gray-500 mb-2">
          {isRealEstate
            ? `Your viewing request has been sent to ${store?.name}.`
            : `Your order has been sent to ${store?.name}.`}
        </p>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Order #</span>
            <span className="font-mono font-black text-xs text-gray-700">{orderNum}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-bold">₦{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Platform fee (10%)</span>
            <span className="font-bold text-orange-600">₦{platformFee.toLocaleString()}</span>
          </div>
          {!isRealEstate&&<div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery</span>
            <span className="font-bold">₦{deliveryFee.toLocaleString()}</span>
          </div>}
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
            <span className="font-black text-gray-900">Total</span>
            <span className="font-black text-gray-900">₦{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment</span>
            <span className="font-semibold capitalize">{payment.replace(/_/g,' ')}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/orders" className="flex-1 py-3 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50">Track Order</Link>
          <Link href="/"       className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:from-orange-600 hover:to-red-700">Back to Home</Link>
        </div>
      </motion.div>
    </div>
  );

  // ── Empty cart ─────────────────────────────────────────────────
  if (totalItems===0) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <ShoppingCart className="w-14 h-14 text-gray-200 mx-auto mb-4"/>
        <h2 className="text-xl font-black text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-5">Add items before checking out.</p>
        <Link href="/" className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600">Browse Stores</Link>
      </div>
    </div>
  );

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href={store?`/store/${store.id}`:'/'}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180 text-gray-600"/>
          </Link>
          <div>
            <h1 className="font-black text-gray-900">
              {isRealEstate ? 'Book Viewing' : 'Checkout'}
            </h1>
            <p className="text-xs text-gray-400">{store?.name} · {totalItems} item{totalItems>1?'s':''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 space-y-5">
            {error&&(
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"/>
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Address */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500"/>
                {isRealEstate ? 'Your Contact Details' : 'Delivery Address'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    {isRealEstate ? 'Your Address' : 'Delivery Address'} *
                  </label>
                  <input type="text" value={address} onChange={e=>setAddress(e.target.value)}
                    placeholder={isRealEstate?"Your current address":"e.g. 14 Admiralty Way, Lekki"} className={ic}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                    <input type="text" value={city} onChange={e=>setCity(e.target.value)} placeholder="Lagos" className={ic}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">State</label>
                    <input type="text" value={state} onChange={e=>setState(e.target.value)} placeholder="Lagos State" className={ic}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone Number *</label>
                  <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234 800 000 0000" className={ic}/>
                </div>

                {/* Real estate: schedule viewing */}
                {isRealEstate && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <Calendar className="w-3.5 h-3.5 inline mr-1"/>Preferred Viewing Date & Time
                    </label>
                    <input type="datetime-local" value={scheduled} onChange={e=>setScheduled(e.target.value)} className={ic}/>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    {isRealEstate ? 'Message / Special Request' : 'Delivery Note'} <span className="normal-case font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
                    placeholder={isRealEstate?"Any questions or special requests...":"e.g. Gate code, landmark, leave at door..."}
                    className={`${ic} resize-none`}/>
                </div>
              </div>
            </div>

            {/* Delivery fee info — food/fashion only */}
            {!isRealEstate && city && (
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
                className="bg-orange-50 rounded-2xl border border-orange-100 p-4 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0"/>
                <div>
                  <p className="text-sm font-bold text-orange-800">Delivering to {city}</p>
                  <p className="text-xs text-orange-600">Delivery fee: <span className="font-black">₦{deliveryFee.toLocaleString()}</span></p>
                </div>
              </motion.div>
            )}

            {/* Fee breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-black text-gray-900 mb-3 text-sm">Price Breakdown</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>Items subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-orange-600 font-semibold">
                  <span className="flex items-center gap-1">AfriCart fee <span className="text-xs text-gray-400">(10%)</span></span>
                  <span>₦{platformFee.toLocaleString()}</span>
                </div>
                {!isRealEstate&&<div className="flex justify-between text-gray-500"><span>Delivery fee</span><span>₦{deliveryFee.toLocaleString()}</span></div>}
                <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span>₦{total.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">10% platform fee applies to all orders. Vendors receive the remaining 90%.</p>
            </div>

            {/* Payment */}
            {!isRealEstate && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-500"/> Payment Method
                </h2>
                <div className="space-y-3">
                  {[
                    { value:'cash_on_delivery', label:'Cash on Delivery', desc:'Pay when your order arrives', icon:<Banknote className="w-5 h-5 text-green-600"/> },
                    { value:'transfer',         label:'Bank Transfer',    desc:'Transfer before delivery',   icon:<Smartphone className="w-5 h-5 text-blue-600"/> },
                    { value:'card',             label:'Debit / Credit Card', desc:'Pay securely online',     icon:<CreditCard className="w-5 h-5 text-purple-600"/> },
                  ].map(opt=>(
                    <label key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment===opt.value?'border-orange-400 bg-orange-50':'border-gray-200 hover:border-orange-200'}`}>
                      <input type="radio" name="pay" value={opt.value} checked={payment===opt.value}
                        onChange={()=>setPayment(opt.value as PaymentMethod)} className="sr-only"/>
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">{opt.icon}</div>
                      <div className="flex-1"><div className="font-bold text-gray-900 text-sm">{opt.label}</div><div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div></div>
                      {payment===opt.value&&<div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">✓</span></div>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orange-500"/> Order Summary
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{store?.name}</p>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto">
                {items.map(item=>(
                  <div key={`${item.product.id}-${item.selected_size}-${item.selected_color}`} className="flex items-center gap-3">
                    {item.product.image_url&&<img src={item.product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"/>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">
                        x{item.quantity}
                        {item.selected_size&&` · ${item.selected_size}`}
                        {item.selected_color&&` · ${item.selected_color}`}
                      </p>
                    </div>
                    <span className="text-sm font-black text-gray-900 flex-shrink-0">₦{(item.product.price*item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm mb-5">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-orange-600 font-semibold"><span>Drovo fee (10%)</span><span>₦{platformFee.toLocaleString()}</span></div>
                  {!isRealEstate&&<div className="flex justify-between text-gray-500"><span>Delivery</span><span>₦{deliveryFee.toLocaleString()}</span></div>}
                  <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
                    <span>Total</span><span>₦{total.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={placeOrder} disabled={placing}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-base hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-60 flex items-center justify-center gap-2">
                  {placing
                    ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Placing...</>
                    : <><ShoppingCart className="w-5 h-5"/>{isRealEstate?'Book Viewing':'Place Order'} · ₦{total.toLocaleString()}</>
                  }
                </button>
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-400">
                  <Shield className="w-3 h-3"/> Secured by Drovo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>}>
      <CheckoutInner/>
    </Suspense>
  );
}
