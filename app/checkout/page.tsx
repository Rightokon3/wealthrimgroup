'use client';
import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, ShoppingCart, ChevronRight, CreditCard,
  Banknote, Smartphone, CheckCircle, AlertCircle,
  Shield, Calendar, Navigation, Plus, Minus, Trash2, X, Copy, Clock,
  Bike, Car, Search, UserRound, Loader2, Home, Briefcase,
  Check, Building2, PartyPopper
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { calculateDeliveryFee } from '@/lib/deliveryFee';
import { loadPaystackScript } from '@/lib/paystack';
import { PaymentMethod, CATEGORY_META } from '@/types';
import type { PickedLocation } from '@/components/vendor/LocationPicker';

// Leaflet needs the browser, so it must not render on the server.
const LocationPicker = dynamic(() => import('@/components/vendor/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ height: 320 }}>
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface SavedAddress {
  id: string; label: string; address: string;
  city: string; state: string | null; is_default: boolean;
  latitude?: number | null; longitude?: number | null;
}

interface Rider {
  id: string;
  full_name: string;
  vehicle_type: string;
  total_deliveries: number;
}

interface TransferAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

const RIDER_ETA_MIN = 20; // fixed — no live GPS to compute a real ETA yet

// Lucide icon for each address label (replaces the emoji)
const LABEL_ICONS: Record<string, React.ReactNode> = {
  Home:  <Home className="w-3.5 h-3.5" />,
  Work:  <Briefcase className="w-3.5 h-3.5" />,
  Other: <MapPin className="w-3.5 h-3.5" />,
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
  const [placedOrder,    setPlacedOrder]    = useState<{
    id: string;
    orderNum: string;
    subtotal: number;
    platformFee: number;
    deliveryFee: number;
    total: number;
    storeName: string;
    isRealEstate: boolean;
    tier?: string;
    paymentMethod: PaymentMethod;
  } | null>(null);
  const [error,          setError]          = useState('');
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Saved addresses + map picker state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addrLoading,    setAddrLoading]    = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [showNewAddr,    setShowNewAddr]    = useState(false);
  const [locateSignal,   setLocateSignal]   = useState(0);
  const [addrNotice,     setAddrNotice]     = useState('');
  const [saveForLater,   setSaveForLater]   = useState(true);
  const [newLabel,       setNewLabel]       = useState('Home');

  // Draft: the customer's address, pin and details survive leaving the page or a refresh
  const draftRestored = useRef(false);
  const orderPlaced   = useRef(false);
  const [draftReady, setDraftReady] = useState(false);

  // Payment gateway state
  const [showBankModal,   setShowBankModal]   = useState(false);
  const [copiedField,     setCopiedField]     = useState<string | null>(null);
  const [transferAccount, setTransferAccount] = useState<TransferAccount | null>(null);
  const [accountLoading,  setAccountLoading]  = useState(false);
  const [accountError,    setAccountError]    = useState('');

  // Live payment status for transfer orders — flips 'pending' -> 'paid'
  // automatically the moment the Paystack webhook confirms the transfer.
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [payRef, setPayRef] = useState('');          // card reference, shown if confirmation is slow
  const recoveryTried = useRef(false);

  // Validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingFields,       setMissingFields]       = useState<string[]>([]);

  // Rider matching state
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [ridersLoading,  setRidersLoading]  = useState(false);
  const [onlineRiders,   setOnlineRiders]   = useState<Rider[]>([]);
  const [riderSearchErr, setRiderSearchErr] = useState('');
  const [assignedRider,  setAssignedRider]  = useState<Rider | null>(null);

  // The rider is also kept in a ref because pickRider() starts the payment
  // flow in the same tick, before React has re-rendered with the new state.
  const riderRef = useRef<Rider | null>(null);
  function setRider(r: Rider | null) {
    riderRef.current = r;
    setAssignedRider(r);
  }

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    if (!al && !isLoggedIn) router.replace('/auth/login?next=/checkout');
  }, [al, isLoggedIn, router]);

  // ── Pre-fill from profile ─────────────────────────────────────
  useEffect(() => {
    if (draftRestored.current) return;
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.city)  setCity(profile.city);
  }, [profile]);

  // ── Restore / save the checkout draft ─────────────────────────
  const draftKey = user ? `drovo_checkout_draft_${user.id}` : null;

  function clearDraft() {
    if (!draftKey) return;
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.address || d.customerCoords) {
          draftRestored.current = true;
          setAddress(d.address ?? '');
          setCity(d.city ?? '');
          setState(d.state ?? '');
          if (d.phone) setPhone(d.phone);
          setNote(d.note ?? '');
          setScheduled(d.scheduled ?? '');
          if (d.payment === 'cash_on_delivery' || d.payment === 'card') setPayment(d.payment);
          setCustomerCoords(d.customerCoords ?? null);
          setSelectedAddrId(d.selectedAddrId ?? null);
          setShowNewAddr(!!d.showNewAddr);
          if (typeof d.saveForLater === 'boolean') setSaveForLater(d.saveForLater);
          if (d.newLabel) setNewLabel(d.newLabel);
        }
      }
    } catch { /* ignore a corrupt draft */ }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftReady || orderPlaced.current) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        address, city, state, phone, note, scheduled,
        payment: payment === 'transfer' ? 'cash_on_delivery' : payment,
        customerCoords, selectedAddrId, showNewAddr, saveForLater, newLabel,
      }));
    } catch { /* storage full or blocked */ }
  }, [draftKey, draftReady, address, city, state, phone, note, scheduled, payment, customerCoords, selectedAddrId, showNewAddr, saveForLater, newLabel]);

  // ── Load saved addresses, auto-select default ─────────────────
  useEffect(() => {
    if (!user) return;
    setAddrLoading(true);
    supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error: aErr }) => {
        setAddrLoading(false);
        if (aErr || !data || data.length === 0) {
          setSavedAddresses([]);
          setShowNewAddr(true); // nothing saved -> go straight to the map form
          return;
        }
        setSavedAddresses(data as SavedAddress[]);
        if (draftRestored.current) return; // keep what the customer was already working on
        const def = (data as SavedAddress[]).find(a => a.is_default) ?? (data as SavedAddress[])[0];
        applySavedAddress(def);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Address helpers ───────────────────────────────────────────
  function applySavedAddress(addr: SavedAddress) {
    setSelectedAddrId(addr.id);
    setAddress(addr.address);
    setCity(addr.city);
    setState(addr.state ?? '');
    setError('');
    if (addr.latitude != null && addr.longitude != null) {
      setCustomerCoords({ lat: addr.latitude, lng: addr.longitude });
      setAddrNotice('');
      setShowNewAddr(false);
    } else {
      // Older address without a map pin: open the map so the customer can drop one.
      setCustomerCoords(null);
      setAddrNotice('This saved address has no map pin yet. Drop a pin so the rider can find you.');
      setShowNewAddr(true);
    }
  }

  function handleNewAddress() {
    setSelectedAddrId(null);
    setAddress(''); setCity(''); setState('');
    setCustomerCoords(null);
    setAddrNotice('');
    setShowNewAddr(true);
  }

  function handleUseMyLocation() {
    if (selectedAddrId || !showNewAddr) handleNewAddress();
    setLocateSignal(s => s + 1);
  }

  // Called by the map whenever the pin moves. Auto-fills the address fields
  // (the customer can still edit them, e.g. to add a flat number).
  function handleLocationChange(loc: PickedLocation) {
    setCustomerCoords({ lat: loc.latitude, lng: loc.longitude });
    setError('');
    if (loc.address !== undefined) setAddress(loc.address);
    if (loc.city)  setCity(loc.city);
    if (loc.state) setState(loc.state);
  }

  // ── Live delivery fee (distance-based) ───────────────────────
  const feeResult = useMemo(() => {
    if (!store || !city.trim()) return null;
    const vendorCoords = (store.latitude != null && store.longitude != null)
      ? { lat: store.latitude, lng: store.longitude }
      : null;
    return calculateDeliveryFee(city, store.city, customerCoords, vendorCoords, store.custom_delivery_fee ?? null);
  }, [city, store, customerCoords]);

  const isRealEstate = store?.category === 'real_estate';
  const deliveryFee  = isRealEstate ? 0 : (feeResult?.fee ?? 0);
  const platformFee  = Math.round(subtotal * 0.12);
  const total        = subtotal + deliveryFee;

  // ── Fetch (or create) this customer's dedicated Paystack account ──
  async function fetchTransferAccount() {
    setAccountLoading(true);
    setAccountError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please log in again to continue.');

      const res = await fetch('/api/paystack/dedicated-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load transfer account');

      setTransferAccount({
        accountNumber: data.accountNumber,
        accountName:   data.accountName,
        bankName:      data.bankName,
      });
    } catch (e: any) {
      setAccountError(e.message ?? 'Failed to load transfer account');
    } finally {
      setAccountLoading(false);
    }
  }

  // ── Payment method change ────────────────────────────────────
  function handlePaymentChange(value: PaymentMethod) {
    setPayment(value);
    if (value === 'transfer') {
      setShowBankModal(true);
      // Only hit the API if we don't already have (or aren't already
      // fetching) an account for this session.
      if (!transferAccount && !accountLoading) fetchTransferAccount();
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
    if (!isRealEstate && !customerCoords) missing.push('Your pinned location on the map');
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
    // Matches riders by distance to the vendor's pin (25 km) OR by the same city name,
    // through a database function so customers never read the riders table directly.
    const { data, error: rErr } = await supabase.rpc('find_nearby_riders', {
      p_city:      store.city,
      p_lat:       store.latitude  ?? null,
      p_lng:       store.longitude ?? null,
      p_radius_km: 25,
    });

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
    setRider(rider);
    setShowRiderModal(false);
    runPaymentFlow();
  }

  // Let the customer proceed without a rider if none are online right
  // now — dispatch can assign one manually afterwards.
  function continueWithoutRider() {
    setRider(null);
    setShowRiderModal(false);
    runPaymentFlow();
  }

  async function orderHasItems(orderId: string) {
    const { count } = await supabase.from('order_items')
      .select('id', { count: 'exact', head: true }).eq('order_id', orderId);
    return (count ?? 0) > 0;
  }

  // ── Create the order in Supabase, returns the created row ──────
  // With a payment reference this is safe to call again after a bad network:
  // the same reference always gives back the same order (never a duplicate).
  async function createOrder(paystackRef?: string) {
    if (!user) throw new Error('Not logged in.');

    let existing: any = null;
    if (paystackRef) {
      const { data: ex } = await supabase.from('orders')
        .select('id, order_number, subtotal, delivery_fee, total, delivery_type, payment_method, stores:store_id(name)').eq('payment_reference', paystackRef).maybeSingle();
      existing = ex ?? null;
    }

    if (!existing && !store) throw new Error('Not ready to place order.');

    const { data: order, error: oErr } = existing ? { data: existing, error: null } : await supabase
      .from('orders')
      .insert([{
        customer_id:      user.id,
        store_id:         store!.id,
        delivery_type:    isRealEstate ? 'viewing' : 'delivery',
        delivery_address: address,
        delivery_city:    city,
        delivery_state:   state || null,
        delivery_latitude:  customerCoords?.lat ?? null,
        delivery_longitude: customerCoords?.lng ?? null,
        customer_phone:   phone,
        delivery_note:    note || null,
        scheduled_at:     scheduled || null,
        subtotal,
        delivery_fee:     deliveryFee,
        total,
        payment_method:   payment,
        payment_status:   'pending', // the server marks it paid only after checking Paystack + the amount
        payment_reference: paystackRef ?? null,
        assigned_rider_id: isRealEstate ? null : (riderRef.current?.id ?? null),
      }])
      .select('id, order_number, subtotal, delivery_fee, total, delivery_type')
      .single();

    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = (existing && (await orderHasItems(order.id))) ? { error: null } : await supabase.from('order_items').insert(
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
    if (!order) throw new Error('Order was not created.');

    // Optionally remember a brand-new address for next time (never blocks the order)
    if (!existing && showNewAddr && !selectedAddrId && saveForLater && customerCoords && address.trim() && city.trim()) {
      supabase.from('saved_addresses').insert({
        user_id:    user.id,
        label:      newLabel,
        address,
        city,
        state:      state || null,
        latitude:   customerCoords.lat,
        longitude:  customerCoords.lng,
        is_default: savedAddresses.length === 0,
      }).then(({ error: sErr }) => {
        if (sErr) console.warn('Could not save address:', sErr.message);
      });
    }

    if (!existing) fetch('/api/notify-vendor', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderId: order.id }),
    }).catch(err => console.warn('Vendor email notification failed:', err));

    orderPlaced.current = true;
    clearDraft();

    const orderSubtotal = Number((order as any).subtotal ?? subtotal);
    const orderDeliveryFee = Number((order as any).delivery_fee ?? deliveryFee);
    const orderTotal = Number((order as any).total ?? total);
    const orderIsRealEstate = ((order as any).delivery_type ?? (isRealEstate ? 'viewing' : 'delivery')) === 'viewing';
    const orderStoreName = existing?.stores?.name ?? store?.name ?? storeName;
    const orderPaymentMethod = ((order as any).payment_method ?? payment) as PaymentMethod;

    return {
      id: order.id as string,
      order_number: order.order_number as string,
      subtotal: orderSubtotal,
      delivery_fee: orderDeliveryFee,
      platform_fee: Math.round(orderSubtotal * 0.12),
      total: orderTotal,
      store_name: orderStoreName,
      is_real_estate: orderIsRealEstate,
      tier: feeResult?.tier,
      payment_method: orderPaymentMethod,
    };
  }

  // ── Cash on delivery ────────────────────────────────────────────
  async function placeOrder() {
    if (!validateForm()) return;
    setPlacing(true); setError('');
    try {
      const order = await createOrder();
      setPlacedOrder({
        id: order.id,
        orderNum: order.order_number,
        subtotal: order.subtotal,
        platformFee: order.platform_fee,
        deliveryFee: order.delivery_fee,
        total: order.total,
        storeName: order.store_name,
        isRealEstate: order.is_real_estate,
        tier: order.tier,
        paymentMethod: order.payment_method,
      });
      clearCart();
      setStoreName(order.store_name);
      setOrderId(order.id);
      setOrderNum(order.order_number);
    } catch (e: any) {
      setError(e.message ?? 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  // ── Bank transfer — order goes in as pending against the customer's
  //    dedicated Paystack account. The webhook (charge.success) flips
  //    payment_status to 'paid' automatically once the transfer lands;
  //    the success screen below picks that up via realtime.
  async function payWithTransfer() {
    if (!validateForm()) return;
    if (!transferAccount) { setError('Still loading your transfer account — try again in a moment.'); return; }
    setPlacing(true); setError('');
    try {
      const order = await createOrder();
      setPlacedOrder({
        id: order.id,
        orderNum: order.order_number,
        subtotal: order.subtotal,
        platformFee: order.platform_fee,
        deliveryFee: order.delivery_fee,
        total: order.total,
        storeName: order.store_name,
        isRealEstate: order.is_real_estate,
        tier: order.tier,
        paymentMethod: order.payment_method,
      });
      clearCart();
      setStoreName(order.store_name);
      setOrderPaymentStatus('pending');
      setOrderId(order.id);
      setOrderNum(order.order_number);
    } catch (e: any) {
      setError(e.message ?? 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  }

  // ── Card payment via Paystack ──────────────────────────────────
  // Money-safety rules:
  //  1. The reference is written down on the phone the moment Paystack says "paid".
  //  2. The order is created from that reference and can be retried safely.
  //  3. Confirmation retries on a bad network. A timeout is NEVER shown as "failed".
  //  4. If the page is closed/refreshed, the recovery effect below finishes the job.
  //  5. The webhook on the server confirms the payment even if the phone never comes back.
  const refKey = user ? `drovo_card_ref_${user.id}` : null;
  const rememberRef = (r: string) => { try { if (refKey) localStorage.setItem(refKey, r); } catch { /* ignore */ } };
  const forgetRef   = () => { try { if (refKey) localStorage.removeItem(refKey); } catch { /* ignore */ } };

  async function verifyWithRetry(reference: string): Promise<{ ok: true | false | null; message?: string }> {
    for (let i = 0; i < 8; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      try {
        const r = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
          signal: ctrl.signal,
        });
        const j = await r.json();
        if (j.verified) return { ok: true };
        if (!j.retry) return { ok: false, message: j.error };
      } catch { /* no network - try again */ }
      finally { clearTimeout(timer); }
      await new Promise(res => setTimeout(res, 2500 * (i + 1)));
    }
    return { ok: null }; // still not sure - NOT a failure
  }

  async function createOrderWithRetry(reference: string) {
    let lastErr: any;
    for (let i = 0; i < 4; i++) {
      try { return await createOrder(reference); }
      catch (e) { lastErr = e; await new Promise(res => setTimeout(res, 2000 * (i + 1))); }
    }
    throw lastErr;
  }

  async function finishCardPayment(reference: string) {
    setPayRef(reference);
    rememberRef(reference);
    const order = await createOrderWithRetry(reference);
    setPlacedOrder({
      id: order.id,
      orderNum: order.order_number,
      subtotal: order.subtotal,
      platformFee: order.platform_fee,
      deliveryFee: order.delivery_fee,
      total: order.total,
      storeName: order.store_name,
      isRealEstate: order.is_real_estate,
      tier: order.tier,
      paymentMethod: order.payment_method,
    });
    clearCart();
    setStoreName(order.store_name);
    setOrderPaymentStatus('pending');
    setOrderId(order.id);
    setOrderNum(order.order_number);
    setPlacing(false);

    const v = await verifyWithRetry(reference);
    if (v.ok === true) { setOrderPaymentStatus('paid'); forgetRef(); }
    else if (v.ok === false) {
      forgetRef();
      setError(v.message || 'We could not confirm this payment. Please contact support with reference ' + reference);
    }
    // ok === null: keep the reference; the live watcher below flips the screen when the server confirms.
  }

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
              await finishCardPayment(response.reference);
            } catch (e: any) {
              setError('Your payment went through but we could not finish your order yet. Do NOT pay again. Reference: '
                + response.reference + '. Refresh this page and we will complete it automatically.');
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

  // If the customer paid but the page closed / lost network before the order was saved,
  // finish it as soon as they come back to checkout.
  useEffect(() => {
    if (!user || !draftReady || orderId || recoveryTried.current) return;
    let ref: string | null = null;
    try { ref = localStorage.getItem(`drovo_card_ref_${user.id}`); } catch { /* ignore */ }
    if (!ref) return;
    const reference = ref;
    (async () => {
      const { data: ex } = await supabase.from('orders')
        .select('id, order_number, subtotal, delivery_fee, total, delivery_type, payment_method, stores:store_id(name)').eq('payment_reference', reference).maybeSingle();
      if (!ex && (items.length === 0 || !address.trim() || !city.trim() || !phone.trim())) return; // wait for the cart/draft
      recoveryTried.current = true;
      setPayment('card');
      setPlacing(true);
      try { await finishCardPayment(reference); }
      catch { setError('We are still finishing your paid order. Do NOT pay again. Reference: ' + reference + '. Refresh to retry.'); }
      finally { setPlacing(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, draftReady, orderId, items.length, address, city, phone]);

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

  // ── Watch this order's payment_status once placed (card + transfer) ─
  // Flips the success screen to "confirmed" the moment the server marks the order paid.
  // Realtime is the fast path; a 5-second check is the fallback for bad networks.
  useEffect(() => {
    if (!orderId || (payment !== 'transfer' && payment !== 'card') || orderPaymentStatus === 'paid') return;

    const check = async () => {
      const { data } = await supabase.from('orders').select('payment_status').eq('id', orderId).single();
      if (data?.payment_status === 'paid') { setOrderPaymentStatus('paid'); forgetRef(); }
    };

    const channel = supabase
      .channel(`order-payment-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          if ((payload.new as any)?.payment_status === 'paid') { setOrderPaymentStatus('paid'); forgetRef(); }
        }
      )
      .subscribe();

    check();
    const poll = setInterval(check, 5000);
    return () => { clearInterval(poll); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, payment, orderPaymentStatus]);

  // ── Loading ───────────────────────────────────────────────────
  if (al) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Success screen ────────────────────────────────────────────
  if (orderId) {
    const summary = placedOrder;
    const isViewing = summary ? summary.isRealEstate : isRealEstate;
    const summaryStoreName = summary?.storeName || storeName;
    const summarySubtotal = summary ? summary.subtotal : subtotal;
    const summaryPlatformFee = summary ? summary.platformFee : platformFee;
    const summaryDeliveryFee = summary ? summary.deliveryFee : deliveryFee;
    const summaryTotal = summary ? summary.total : total;
    const summaryTier = summary?.tier || feeResult?.tier;
    const summaryPayment = summary?.paymentMethod || payment;

    return (
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4">
        <motion.div initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-200">
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center justify-center gap-2">
            {isViewing ? 'Viewing Booked!' : 'Order Placed!'}
            {isViewing
              ? <Home className="w-7 h-7 text-orange-500" />
              : <PartyPopper className="w-7 h-7 text-orange-500" />}
          </h2>
          <p className="text-gray-500 mb-5">
            {isViewing ? 'Your viewing request has been sent to' : 'Your order has been sent to'}{' '}
            <span className="font-bold text-gray-700">{summaryStoreName}</span>.
          </p>

          {(summaryPayment === 'transfer' || summaryPayment === 'card') && (
            <div className={`flex items-center justify-center gap-2 mb-5 px-4 py-2.5 rounded-xl border text-sm font-bold ${
              orderPaymentStatus === 'paid'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-orange-50 border-orange-200 text-orange-600'
            }`}>
              {orderPaymentStatus === 'paid'
                ? <><CheckCircle className="w-4 h-4" /> Payment confirmed</>
                : <><Loader2 className="w-4 h-4 animate-spin" /> {summaryPayment === 'card' ? 'Confirming your payment — please do not pay again' : 'Waiting for your transfer to land — this updates automatically'}</>
              }
            </div>
          )}
          {summaryPayment === 'card' && orderPaymentStatus === 'pending' && payRef && (
            <p className="text-xs text-gray-400 mb-4 -mt-2">
              Payment reference: <span className="font-mono font-bold text-gray-600">{payRef}</span>. This page updates by itself. If you were charged, your order is safe.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
          )}

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Order #</span><span className="font-mono font-black text-xs">{orderNum}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-bold">₦{summarySubtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Platform fee (12%)</span><span className="font-bold text-orange-600">₦{summaryPlatformFee.toLocaleString()}</span></div>
            {!isViewing && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery {summaryTier && <span className="text-xs text-gray-400">({summaryTier})</span>}</span>
                <span className="font-bold">₦{summaryDeliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span><span>₦{summaryTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Payment</span><span className="font-semibold capitalize">{summaryPayment.replace(/_/g, ' ')}</span></div>
          </div>
          <div className="flex gap-3">
            <Link href="/orders" className="flex-1 py-3 rounded-2xl border-2 border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50">Track Order</Link>
            <Link href="/"       className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:from-orange-600 hover:to-red-700">Back to Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
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
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
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

      {/* Bank transfer details modal — pulls a real, verifiable dedicated
          account for this customer from Paystack instead of a shared account. */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
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

              {accountLoading ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-semibold">Setting up your transfer account...</p>
                </div>
              ) : accountError ? (
                <div>
                  <p className="text-sm text-red-500 font-medium mb-4">{accountError}</p>
                  <button onClick={fetchTransferAccount}
                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">
                    Try again
                  </button>
                </div>
              ) : transferAccount ? (
                <>
                  <p className="text-gray-500 text-sm mb-5">
                    Transfer exactly <span className="font-bold text-gray-900">₦{total.toLocaleString()}</span> to the account below — this account is unique to you, so we confirm your payment automatically once it lands.
                  </p>

                  <div className="space-y-3">
                    {[
                      { label: 'Account Name',   value: transferAccount.accountName,   key: 'name' },
                      { label: 'Account Number', value: transferAccount.accountNumber, key: 'number' },
                      { label: 'Bank',           value: transferAccount.bankName,      key: 'bank' },
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
                </>
              ) : null}
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
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {isRealEstate ? 'Your Contact Details' : 'Delivery Address'}
                </h2>
                {!isRealEstate && (
                  <button type="button" onClick={handleUseMyLocation}
                    className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-all">
                    <Navigation className="w-3 h-3" />Use my location
                  </button>
                )}
              </div>

              {/* Saved addresses */}
              {addrLoading ? (
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {[1, 2].map(i => <div key={i} className="animate-pulse h-24 rounded-2xl bg-gray-100" />)}
                </div>
              ) : savedAddresses.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">Your Saved Addresses</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {savedAddresses.map(addr => {
                      const active = selectedAddrId === addr.id;
                      const pinned = addr.latitude != null && addr.longitude != null;
                      const Icon   = addr.label === 'Work' ? Briefcase : addr.label === 'Other' ? MapPin : Home;
                      return (
                        <button key={addr.id} type="button" onClick={() => applySavedAddress(addr)}
                          className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                            active
                              ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md shadow-orange-100'
                              : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
                          }`}>
                          <div className="flex items-start gap-3 pr-6">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-500'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-gray-900">{addr.label}</span>
                                {addr.is_default && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Default</span>}
                              </div>
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">{addr.address}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{addr.city}{addr.state ? `, ${addr.state}` : ''}</p>
                              <div className="mt-2">
                                {pinned
                                  ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full"><MapPin className="w-2.5 h-2.5" />Pinned</span>
                                  : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full"><MapPin className="w-2.5 h-2.5" />No pin yet</span>}
                              </div>
                            </div>
                          </div>
                          {active && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button type="button" onClick={handleNewAddress}
                    className={`mt-3 w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      showNewAddr && !selectedAddrId
                        ? 'border-orange-400 bg-orange-50 text-orange-600'
                        : 'border-orange-200 text-orange-500 hover:border-orange-400 hover:bg-orange-50'
                    }`}>
                    <Plus className="w-4 h-4" /> Use a different address
                  </button>
                </div>
              )}

              {/* Map + manual address (new address, or a saved one with no pin yet) */}
              {!addrLoading && showNewAddr && (
                <div className="space-y-4 mb-4">
                  {addrNotice && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 font-medium">{addrNotice}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                      {isRealEstate ? 'Find Your Location' : 'Pin Your Delivery Location *'}
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                      Search for your area, use your current location, or tap the map to drop a pin. {!isRealEstate && 'The rider uses this pin to find you.'}
                    </p>
                    <LocationPicker
                      value={customerCoords ? { latitude: customerCoords.lat, longitude: customerCoords.lng } : null}
                      onChange={handleLocationChange}
                      locateSignal={locateSignal}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      {isRealEstate ? 'Your Address' : 'Street Address'} *{' '}
                      <span className="normal-case font-normal text-gray-400">(auto-filled, add flat / house number if needed)</span>
                    </label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Pin a location to fill this in" className={ic} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">City *</label>
                      <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Auto-filled" className={ic} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">State</label>
                      <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="Auto-filled" className={ic} />
                    </div>
                  </div>

                  {/* Offer to remember a brand-new address */}
                  {!selectedAddrId && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={saveForLater} onChange={e => setSaveForLater(e.target.checked)}
                          className="w-4 h-4 accent-orange-500" />
                        <span className="text-sm font-semibold text-gray-700">Save this address for next time</span>
                      </label>
                      {saveForLater && (
                        <div className="flex gap-2 mt-3">
                          {['Home', 'Work', 'Other'].map(l => (
                            <button key={l} type="button" onClick={() => setNewLabel(l)}
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${newLabel === l ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                              {LABEL_ICONS[l]}{l}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Phone etc. */}
              <div className="space-y-4">
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
                    <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1 text-center">
                      {customerCoords
                        ? <><MapPin className="w-3 h-3 flex-shrink-0" />Based on your pinned location</>
                        : <><Building2 className="w-3 h-3 flex-shrink-0" />Based on city distance — pin your location for a more accurate fee</>}
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
                  <span>Drovo fee (12%)</span><span>₦{platformFee.toLocaleString()}</span>
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
                <p>• 12% platform fee is deducted — vendor receives 88%</p>
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
                    { value: 'transfer',         label: 'Bank Transfer',        desc: 'Pay to your unique account — confirmed automatically', icon: <Smartphone className="w-5 h-5 text-blue-600" /> },
                    { value: 'card',             label: 'Debit / Credit Card',  desc: 'Pay securely via Paystack',  icon: <CreditCard className="w-5 h-5 text-purple-600" /> },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${payment === opt.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
                      <input type="radio" name="pay" value={opt.value} checked={payment === opt.value}
                        onChange={() => handlePaymentChange(opt.value as PaymentMethod)} className="sr-only" />
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">{opt.icon}</div>
                      <div className="flex-1"><div className="font-bold text-gray-900 text-sm">{opt.label}</div><div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div></div>
                      {payment === opt.value && (
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
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
                    <button onClick={() => setRider(null)} className="text-xs font-bold text-green-700 hover:underline flex-shrink-0">Change</button>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm mb-5">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-orange-600 font-semibold"><span>Drovo fee (12%)</span><span>₦{platformFee.toLocaleString()}</span></div>
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
                  <Shield className="w-3 h-3" /> Secured by Drovo{payment === 'card' && ' & Paystack'}{payment === 'transfer' && ' & Paystack'}
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