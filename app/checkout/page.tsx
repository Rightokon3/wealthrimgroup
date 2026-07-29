'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, ShoppingCart, ChevronRight, CreditCard,
  Banknote, Smartphone, CheckCircle, AlertCircle,
  Shield, Calendar, Navigation, Plus, Minus, Trash2, X, Copy, Clock,
  Bike, Car, Search, UserRound
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { calculateDeliveryFee } from '@/lib/deliveryFee';
import { loadPaystackScript } from '@/lib/paystack';
import { PaymentMethod, CATEGORY_META } from '@/types';

interface SavedAddress {
  id: string; label: string; address: string;
  city: string; state: string | null; is_default: boolean;
}

interface Rider {
  id: string;
  full_name: string;
  vehicle_type: string;
  total_deliveries: number;
}

const RIDER_ETA_MIN = 20; // fixed — no live GPS to compute a real ETA yet

// One fixed company account shown to every customer who pays by transfer.
// Edit these three values to match your real bank details.
const BANK_ACCOUNT = {
  accountName:   'Wealthy Realm Int Ltd',
  accountNumber: '3003841291',
  bankName:      'Guaranty Trust Bank',
};

function CheckoutInner() {
  const router  = useRouter();
  const { user, profile, isLoggedIn, loading: al } = useAuth();
  const { items, store, subtotal, totalItems, clearCart, removeItem, updateQty } = useCart();

  const [address,        setAddress]        = useState('');
  const [city,           setCity]           = useState('');
  const [state,          setState]          = useState('');
  const [phone,          setPhone]          = useState('');
  const [note,           setNote]           = useState('');
  const [scheduled,      setScheduled]      = useState('');
  const [payment,        setPayment]        = useState<PaymentMethod>('cash_on_delivery');
  const [placing,        setPlacing]        = useState(false);
  const [orderId,        setOrderId]        = useState<string | null>(null);
  const [orderNum,       setOrderNum]       = useState('');
  const [storeName,      setStoreName]      = useState('');
  const [error,          setError]          = useState('');
  const [locating,       setLocating]       = useState(false);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);

  // Payment gateway state
  const [showBankModal, setShowBankModal] = useState(false);
  const [copiedField,   setCopiedField]   = useState<string | null>(null);

  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingFields,       setMissingFields]       = useState<string[]>([]);

  // Rider matching state
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [ridersLoading,  setRidersLoading]  = useState(false);
  const [onlineRiders,   setOnlineRiders]   = useState<Rider[]>([]);
  const [riderSearchErr, setRiderSearchErr] = useState('');
  const [assignedRider,  setAssignedRider]  = useState<Rider | null>(null);

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    if (!al && !isLoggedIn) router.replace('/auth/login?next=/checkout');
  }, [al, isLoggedIn, router]);

  // ── Pre-fill from profile ─────────────────────────────────────
  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.city)  setCity(profile.city);
  }, [profile]);

  // ── Load saved addresses, auto-select default ─────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_addresses')
      .select('*')
      .eq('profile_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setSavedAddresses(data);
        const def = data.find((a: SavedAddress) => a.is_default);
        if (def && !address) {
          setAddress(def.address);
          setCity(def.city);
          setState(def.state ?? '');
          setSelectedAddrId(def.id);
        }
      });
  }, [user]);

  // ── Live delivery fee (distance-based) ───────────────────────
  const feeResult = useMemo(() => {
    if (!store || !city.trim()) return null;
    const vendorCoords = (store.latitude != null && store.longitude != null)
      ? { lat: store.latitude, lng: store.longitude }
      : null;
    return calculateDeliveryFee(city, store.city, customerCoords, vendorCoords, store.custom_delivery_fee ?? null);
  }, [city, store, customerCoords]);

  const isRealEstate = store?.category === 'real_estate';
  const deliveryFee  = isRealEstate ? 0 : (feeResult?.fee ?? 3000);
  const platformFee  = Math.round(subtotal * 0.10);
  const total        = subtotal + deliveryFee;

  // ── GPS location ──────────────────────────────────────────────
  function detectLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setCustomerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      ()  => setLocating(false),
      { timeout: 8000 }
    );
  }

  // ── Payment method change ────────────────────────────────────
  function handlePaymentChange(value: PaymentMethod) {
    setPayment(value);
    if (value === 'transfer') {
      setShowBankModal(true);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  // ── Shared validation ─────────────────────────────────────────
  function validateForm(): boolean {
    const missing: string[] = [];
    if (!address.trim())    missing.push(isRealEstate ? 'Your address' : 'Delivery address');
    if (!city.trim())       missing.push('City');
    if (!phone.trim())      missing.push('Phone number');
    if (items.length === 0) missing.push('At least one item in your cart');

    if (missing.length > 0) {
      setMissingFields(missing);
      setShowValidationModal(true);
      return false;
    }
    return true;
  }

  // ── Search for online riders in the vendor's city ───────────────
  async function searchForRiders() {
    if (!store) return;
    setShowRiderModal(true);
    setRidersLoading(true);
    setRiderSearchErr('');

    const searchStart = Date.now();
    const { data, error: rErr } = await supabase
      .from('riders')
      .select('id, full_name, vehicle_type, total_deliveries')
      .eq('is_online', true)
      .eq('is_active', true)
      .ilike('city', store.city)
      .order('total_deliveries', { ascending: false });

    // Keep the "searching" state on screen for at least ~1.1s so it
    // doesn't flash instantly even when the query is fast.
    const elapsed = Date.now() - searchStart;
    if (elapsed < 1100) await new Promise(res => setTimeout(res, 1100 - elapsed));

    if (rErr) {
      setRiderSearchErr(rErr.message);
      setOnlineRiders([]);
    } else {
      setOnlineRiders(data ?? []);
    }
    setRidersLoading(false);
  }

  function pickRider(rider: Rider) {
    setAssignedRider(rider);
    setShowRiderModal(false);
    runPaymentFlow();
  }

  // Let the customer proceed without a rider if none are online right
  // now — dispatch can assign one manually afterwards.
  function continueWithoutRider() {
    setAssignedRider(null);
    setShowRiderModal(false);
    runPaymentFlow();
  }

  // ── Create the order in Supabase, returns the created row ──────
  async function createOrder(paystackRef?: string) {
    if (!user || !store) throw new Error('Not ready to place order.');

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert([{
        customer_id:      user.id,
        store_id:         store.id,
        delivery_type:    isRealEstate ? 'viewing' : 'delivery',
        delivery_address: address,
        delivery_city:    city,
        delivery_state:   state || null,
        customer_phone:   phone,
        delivery_note:    note || null,
        scheduled_at:     scheduled || null,
        subtotal,
        delivery_fee:     deliveryFee,
        total,
        payment_method:   payment,
        payment_status:   paystackRef ? 'paid' : 'pending',
        payment_reference: paystackRef ?? null,
        assigned_rider_id: isRealEstate ? null : (assignedRider?.id ?? null),
      }])
      .select('id, order_number')
      .single();

    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await supabase.from('order_items').insert(
      items.map(i => ({
        order_id:       order.id,
        product_id:     i.product.id,
        name:           i.product.name,
        price:          i.product.price,
        quantity:       i.quantity,
        subtotal:       i.product.price * i.quantity,
        selected_size:  i.selected_size  ?? null,
        selected_color: i.selected_color ?? null,
        image_url:      i.product.image_url ?? null,
      }))
    );
    if (iErr) throw new Error(iErr.message);

    fetch('/api/notify-vendor', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId: order.id }),
    }).catch(err => console.warn('Vendor email notification failed:', err));

    return order as { id: string; order_number: string };
  }

  // ── Cash on delivery ────────────────────────────────────────────
  async function placeOrder() {
    if (!validateForm()) return;
    setPlacing(true); setError('');
    try {
      const order = await createOrder();
      clearCart();
      setStoreName(store?.name ?? '');
      setOrderId(order.id);
      setOrderNum(order.order_number);
    } catch (e: any) {
      setError(e.message ?? 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  // ── Bank transfer — customer confirms they've sent the money,
  //    order goes in as pending and lands on the normal success screen.
  //    No auto-detection: staff/admin marks it paid once the transfer lands.
  async function payWithTransfer() {
    if (!validateForm()) return;
    setPlacing(true); setError('');
    try {
      const order = await createOrder();
      clearCart();
      setStoreName(store?.name ?? '');
      setOrderId(order.id);
      setOrderNum(order.order_number);
    } catch (e: any) {
      setError(e.message ?? 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  }

  // ── Card payment via Paystack ──────────────────────────────────
  async function payWithCard() {
    if (!validateForm()) return;
    const email = user?.email ?? profile?.email;
    if (!email) { setError('Your account needs an email on file to pay by card.'); return; }

    setPlacing(true); setError('');
    try {
      await loadPaystackScript();
      const PaystackPop = (window as any).PaystackPop;

      const handler = PaystackPop.setup({
        key:    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: Math.round(total * 100),
        currency: 'NGN',
        ref: `drovo_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        callback: (response: any) => {
          (async () => {
            try {
              const res = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: response.reference }),
              });
              const result = await res.json();
              if (!result.verified) {
                setError('Payment could not be verified. If you were charged, contact support with reference ' + response.reference);
                setPlacing(false);
                return;
              }
              const order = await createOrder(result.reference);
              clearCart();
              setStoreName(store?.name ?? '');
              setOrderId(order.id);
              setOrderNum(order.order_number);
            } catch (e: any) {
              setError(e.message ?? 'Something went wrong confirming your payment.');
            } finally {
              setPlacing(false);
            }
          })();
        },
        onClose: () => setPlacing(false),
      });

      handler.openIframe();
    } catch (e: any) {
      setError(e.message ?? 'Failed to open payment window.');
      setPlacing(false);
    }
  }

  function handlePlaceOrderClick() {
    if (!validateForm()) return;
    // Real estate bookings have no delivery — skip rider matching.
    if (!isRealEstate && !assignedRider) {
      searchForRiders();
      return;
    }
    runPaymentFlow();
  }

  function runPaymentFlow() {
    if (payment === 'card') payWithCard();
    else if (payment === 'transfer') payWithTransfer();
    else placeOrder();
  }

  // Bank modal's "I've Sent the Transfer" button also needs to go
  // through the same validation + rider-search gate as the main button.
  function confirmTransferSent() {
    setShowBankModal(false);
    if (!validateForm()) return;
    if (!isRealEstate && !assignedRider) {
      searchForRiders();
      return;
    }
    payWithTransfer();
  }

  // ── Loading ───────────────────────────────────────────────────
  if (al) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Success screen ────────────────────────────────────────────
  if (orderId) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4">
      <motion.div initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md w-full">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-200">
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">
          {isRealEstate ? 'Viewing Booked! 🏠' : 'Order Placed! 🎉'}
        </h2>
        <p className="text-gray-500 mb-5">
          {isRealEstate ? 'Your viewing request has been sent to' : 'Your order has been sent to'}{' '}
          <span className="font-bold text-gray-700">{storeName}</span>.
          {payment === 'transfer' && ' We\'ll confirm your payment once it lands.'}
        </p>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Order #</span><span className="font-mono font-black text-xs">{orderNum}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-bold">₦{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Platform fee (10%)</span><span className="font-bold text-orange-600">₦{platformFee.toLocaleString()}</span></div>
          {!isRealEstate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery {feeResult && <span className="text-xs text-gray-400">({feeResult.tier})</span>}</span>
              <span className="font-bold">₦{deliveryFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
            <span>Total</span><span>₦{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Payment</span><span className="font-semibold capitalize">{payment.replace(/_/g, ' ')}</span></div>
        </div>
        <div className="flex gap-3">
          <Link href="/orders" className="flex-1 py-3 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50">Track Order</Link>
          <Link href="/"       className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:from-orange-600 hover:to-red-700">Back to Home</Link>
        </div>
      </motion.div>
    </div>
  );

  // ── Empty cart ────────────────────────────────────────────────
  if (totalItems === 0) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <ShoppingCart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-800 mb-2">Your cart is empty</h2>
        <Link href="/" className="inline-block px-6 py-3 mt-3 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600">Browse Stores</Link>
      </div>
    </div>
  );

  const ic = 'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Missing details validation modal */}
      <AnimatePresence>
        {showValidationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowValidationModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <button onClick={() => setShowValidationModal(false)} className="absolute top-4 right-4 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-1">A few details are missing</h3>
              <p className="text-gray-500 text-sm mb-4">
                Please fill in the following before we can place your {isRealEstate ? 'viewing request' : 'order'}:
              </p>
              <ul className="space-y-2 mb-5">
                {missingFields.map(field => (
                  <li key={field} className="flex items-center gap-2 text-sm font-semibold text-gray-800 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowValidationModal(false)}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black hover:from-orange-600 hover:to-red-700">
                Got it, I'll fill it in
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rider search / selection modal */}
      <AnimatePresence>
        {showRiderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !ridersLoading && setShowRiderModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              {!ridersLoading && (
                <button onClick={() => setShowRiderModal(false)} className="absolute top-4 right-4 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              )}

              {ridersLoading ? (
                <div className="py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5 relative">
                    <Search className="w-7 h-7 text-orange-500" />
                    <div className="absolute inset-0 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Searching for nearby riders...</h3>
                  <p className="text-gray-400 text-sm">Looking for online riders near {store?.name}</p>
                </div>
              ) : riderSearchErr ? (
                <div>
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Couldn't search for riders</h3>
                  <p className="text-gray-500 text-sm mb-5">{riderSearchErr}</p>
                  <button onClick={searchForRiders} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">Try again</button>
                </div>
              ) : onlineRiders.length === 0 ? (
                <div>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <UserRound className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-1">No riders online right now</h3>
                  <p className="text-gray-500 text-sm mb-5">There's no rider currently online near {store?.name}. You can still place your order — we'll assign a rider as soon as one comes online.</p>
                  <div className="flex gap-3">
                    <button onClick={searchForRiders} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">Search again</button>
                    <button onClick={continueWithoutRider} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">Continue</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-1">Riders near you</h3>
                  <p className="text-gray-500 text-sm mb-4">Pick a rider to deliver your order.</p>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto mb-1">
                    {onlineRiders.map(rider => {
                      const VehicleIcon = rider.vehicle_type === 'car' ? Car : Bike;
                      return (
                        <button key={rider.id} onClick={() => pickRider(rider)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left">
                          <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <VehicleIcon className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{rider.full_name}</p>
                            <p className="text-xs text-gray-400 capitalize">{rider.vehicle_type} · {rider.total_deliveries} deliveries</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-orange-600 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />~{RIDER_ETA_MIN} min
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bank transfer details modal — plain, fixed account, no API call */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBankModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <button onClick={() => setShowBankModal(false)} className="absolute top-4 right-4 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Bank Transfer Details</h3>
              <p className="text-gray-500 text-sm mb-5">
                Transfer exactly <span className="font-bold text-gray-900">₦{total.toLocaleString()}</span> to the account below, then confirm you've sent it.
              </p>

              <div className="space-y-3">
                {[
                  { label: 'Account Name',   value: BANK_ACCOUNT.accountName,   key: 'name' },
                  { label: 'Account Number', value: BANK_ACCOUNT.accountNumber, key: 'number' },
                  { label: 'Bank',           value: BANK_ACCOUNT.bankName,      key: 'bank' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-bold">{f.label}</p>
                      <p className="text-sm font-bold text-gray-900">{f.value}</p>
                    </div>
                    <button onClick={() => copyToClipboard(f.value, f.key)}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 flex-shrink-0">
                      {copiedField === f.key ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={confirmTransferSent}
                disabled={placing}
                className="w-full mt-5 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black hover:from-orange-600 hover:to-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {placing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Placing...</>
                  : "I've Sent the Transfer — Place Order"
                }
              </button>
              <button onClick={() => setShowBankModal(false)}
                className="w-full mt-2 py-2.5 text-gray-400 font-semibold text-sm hover:text-gray-600">
                I'll pay later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href={store ? `/store/${store.id}` : '/'} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <ChevronRight className="w-4 h-4 rotate-180 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-black text-gray-900">{isRealEstate ? 'Book Viewing' : 'Checkout'}</h1>
            <p className="text-xs text-gray-400">{store?.name} · {totalItems} item{totalItems > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── LEFT: Form ────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Address card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {isRealEstate ? 'Your Contact Details' : 'Delivery Address'}
                </h2>
                {!isRealEstate && (
                  <button type="button" onClick={detectLocation} disabled={locating}
                    className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full hover:bg-orange-100 disabled:opacity-60 transition-all">
                    {locating
                      ? <><div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />Locating...</>
                      : <><Navigation className="w-3 h-3" />Use my location</>
                    }
                  </button>
                )}
              </div>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saved Addresses</p>
                  {savedAddresses.map(addr => (
                    <button key={addr.id} type="button"
                      onClick={() => { setSelectedAddrId(addr.id); setAddress(addr.address); setCity(addr.city); setState(addr.state ?? ''); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedAddrId === addr.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
                      <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedAddrId === addr.id ? 'text-orange-500' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{addr.label}</span>
                          {addr.is_default && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Default</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{addr.address}, {addr.city}</p>
                      </div>
                      {selectedAddrId === addr.id && <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">✓</span></div>}
                    </button>
                  ))}
                  <button type="button" onClick={() => { setSelectedAddrId(null); setAddress(''); setCity(''); setState(''); }}
                    className="w-full py-2 text-xs text-gray-400 font-semibold hover:text-orange-500 transition-colors">
                    + Enter a different address
                  </button>
                  <div className="border-t border-gray-100" />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{isRealEstate ? 'Your Address' : 'Street Address'} *</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    placeholder={isRealEstate ? "Your current address" : "e.g. 14 Admiralty Way, Lekki"} className={ic} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Lagos" className={ic} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">State</label>
                    <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="e.g. Lagos State" className={ic} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Phone *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 800 000 0000" className={ic} />
                </div>
                {isRealEstate && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />Preferred Viewing Date & Time
                    </label>
                    <input type="datetime-local" value={scheduled} onChange={e => setScheduled(e.target.value)} className={ic} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    {isRealEstate ? 'Message / Special Request' : 'Delivery Note'}{' '}
                    <span className="normal-case font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                    placeholder={isRealEstate ? "Any questions or special requests..." : "e.g. Gate code, landmark, leave at door..."}
                    className={`${ic} resize-none`} />
                </div>
              </div>
            </div>

            {/* Live delivery fee card */}
            {!isRealEstate && city && store && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-4 ${
                    feeResult && feeResult.fee < 2000 ? 'bg-green-50 border-green-200'
                    : feeResult && feeResult.fee < 3000 ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-200'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-bold text-gray-900">{city} → {store.city}</span>
                      </div>
                      {feeResult && (
                        <p className="text-xs text-gray-500 ml-6">
                          {feeResult.distanceKm !== null ? `~${feeResult.distanceKm} km away` : feeResult.label}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-xl text-gray-900">₦{deliveryFee.toLocaleString()}</div>
                      {feeResult && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          feeResult.fee < 1500 ? 'bg-green-100 text-green-700'
                          : feeResult.fee < 2500 ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                        }`}>{feeResult.tier}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/60">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>₦500</span><span className="font-semibold text-gray-600">Delivery fee</span><span>₦3,000</span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((deliveryFee - 500) / 2500) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      {customerCoords ? '📍 Based on your GPS location' : '🏙 Based on city distance — share location for a more accurate fee'}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Fee breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-black text-gray-900 mb-3 text-sm">Price Breakdown</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>Items subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-orange-600 font-semibold">
                  <span>Drovo fee (10%)</span><span>₦{platformFee.toLocaleString()}</span>
                </div>
                {!isRealEstate && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery {feeResult ? `(${feeResult.tier})` : ''}</span>
                    <span>₦{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span><span>₦{total.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-400 space-y-1">
                <p>• Delivery fee starts at ₦3,000 and reduces the closer you are to the vendor</p>
                <p>• 10% platform fee is deducted — vendor receives 90%</p>
              </div>
            </div>

            {/* Payment */}
            {!isRealEstate && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-500" /> Payment Method
                </h2>
                <div className="space-y-3">
                  {[
                    { value: 'cash_on_delivery', label: 'Cash on Delivery',    desc: 'Pay when your order arrives', icon: <Banknote className="w-5 h-5 text-green-600" /> },
                    { value: 'transfer',         label: 'Bank Transfer',        desc: 'Pay to our account, we confirm manually', icon: <Smartphone className="w-5 h-5 text-blue-600" /> },
                    { value: 'card',             label: 'Debit / Credit Card',  desc: 'Pay securely via Paystack',  icon: <CreditCard className="w-5 h-5 text-purple-600" /> },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
                      <input type="radio" name="pay" value={opt.value} checked={payment === opt.value}
                        onChange={() => handlePaymentChange(opt.value as PaymentMethod)} className="sr-only" />
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">{opt.icon}</div>
                      <div className="flex-1"><div className="font-bold text-gray-900 text-sm">{opt.label}</div><div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div></div>
                      {payment === opt.value && <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">✓</span></div>}
                    </label>
                  ))}
                </div>
                {payment === 'transfer' && (
                  <button type="button" onClick={() => setShowBankModal(true)}
                    className="w-full mt-3 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100">
                    View bank account details again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Order summary ──────────────────────────── */}
          <div className="lg:col-span-2 mb-10 lg:mb-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orange-500" /> Order Summary
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{store?.name}</p>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto">
                {items.map(item => {
                  const lineKey = `${item.product.id}-${item.selected_size}-${item.selected_color}`;
                  return (
                    <div key={lineKey} className="flex items-center gap-3">
                      {item.product.image_url && (
                        <img src={item.product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.selected_size && `${item.selected_size} `}
                          {item.selected_color && `· ${item.selected_color}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button type="button" onClick={() => updateQty(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100" aria-label="Decrease quantity">
                            <Minus className="w-3 h-3 text-gray-500" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100" aria-label="Increase quantity">
                            <Plus className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-sm font-black text-gray-900">
                          ₦{(item.product.price * item.quantity).toLocaleString()}
                        </span>
                        <button type="button" onClick={() => removeItem(item.product.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Remove item">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 pb-5">
                {assignedRider && !isRealEstate && (
                  <div className="flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-green-50 border border-green-100">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      {assignedRider.vehicle_type === 'car' ? <Car className="w-4 h-4 text-green-700" /> : <Bike className="w-4 h-4 text-green-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-green-800 truncate">{assignedRider.full_name}</p>
                      <p className="text-xs text-green-600">~{RIDER_ETA_MIN} min ETA</p>
                    </div>
                    <button onClick={() => setAssignedRider(null)} className="text-xs font-bold text-green-700 hover:underline flex-shrink-0">Change</button>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm mb-5">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-orange-600 font-semibold"><span>Drovo fee (10%)</span><span>₦{platformFee.toLocaleString()}</span></div>
                  {!isRealEstate && (
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery {feeResult && `(${feeResult.tier})`}</span>
                      <span>₦{deliveryFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
                    <span>Total</span><span>₦{total.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={handlePlaceOrderClick} disabled={placing}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-base hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-60 flex items-center justify-center gap-2">
                  {placing
                    ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{payment === 'card' ? 'Waiting for payment...' : 'Placing...'}</>
                    : <><ShoppingCart className="w-5 h-5" />{isRealEstate ? 'Book Viewing' : payment === 'card' ? 'Pay Now' : 'Place Order'} · ₦{total.toLocaleString()}</>
                  }
                </button>
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-400">
                  <Shield className="w-3 h-3" /> Secured by Drovo{payment === 'card' && ' & Paystack'}
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
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <CheckoutInner />
    </Suspense>
  );
}