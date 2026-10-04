'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Phone, Bike, Car, MapPin, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Leaflet needs the browser, so the map is loaded client-side only.
const TrackingMap = dynamic(() => import('@/components/orders/TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface TrackInfo {
  order_id: string;
  order_number: string;
  status: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_city: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  store_name: string | null;
  store_lat: number | null;
  store_lng: number | null;
  rider_name: string | null;
  rider_vehicle: string | null;
  rider_plate: string | null;
  rider_phone: string | null;
  location: { lat: number; lng: number; heading: number | null; updated_at: string } | null;
}

interface LiveLoc { lat: number; lng: number; updated_at: string }

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const TRAFFIC_FACTOR = 1.3; // pad the routing ETA for real traffic
const ACTIVE = ['picked_up', 'on_the_way'];

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fmtDist = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
const fmtMins = (sec: number) => {
  const mins = Math.max(1, Math.round(sec / 60));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
};

export default function TrackOrderPage() {
  const params  = useParams();
  const orderId = params.id as string;
  const { user } = useAuth();

  const [info,     setInfo]     = useState<TrackInfo | null>(null);
  const [loc,      setLoc]      = useState<LiveLoc | null>(null);
  const [route,    setRoute]    = useState<{ coords: [number, number][]; distance: number; duration: number } | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [err,      setErr]      = useState('');
  const [nowTick,  setNowTick]  = useState(Date.now());

  const lastRoute = useRef<{ t: number; lat: number; lng: number } | null>(null);

  // ── Load tracking details (and poll as a safety net) ─────────────────────
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_tracking_info', { p_order_id: orderId });
    if (error) { setErr(error.message); setLoading(false); return; }
    if (!data) { setNotFound(true); setLoading(false); return; }
    setErr('');
    const t = data as TrackInfo;
    setInfo(t);
    if (t.location) setLoc({ lat: Number(t.location.lat), lng: Number(t.location.lng), updated_at: t.location.updated_at });
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  useEffect(() => {
    if (!user || !info || !ACTIVE.includes(info.status)) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [user, info?.status, load]);

  // Instant updates the moment the rider's position changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`track-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rider_locations', filter: `order_id=eq.${orderId}` },
        payload => {
          const row = payload.new as any;
          if (row?.latitude != null) {
            setLoc({ lat: Number(row.latitude), lng: Number(row.longitude), updated_at: row.updated_at });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, orderId]);

  // Clock for the "last updated" label
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const dest  = useMemo(() => (info?.dest_lat  != null && info?.dest_lng  != null ? { lat: Number(info.dest_lat),  lng: Number(info.dest_lng)  } : null), [info?.dest_lat, info?.dest_lng]);
  const store = useMemo(() => (info?.store_lat != null && info?.store_lng != null ? { lat: Number(info.store_lat), lng: Number(info.store_lng) } : null), [info?.store_lat, info?.store_lng]);

  // ── Route + ETA from the rider's position to the customer ────────────────
  useEffect(() => {
    if (!loc || !dest || !info || !ACTIVE.includes(info.status)) return;
    const now = Date.now();
    const prev = lastRoute.current;
    if (prev && now - prev.t < 20000 && metres(prev, loc) < 150) return;
    lastRoute.current = { t: now, lat: loc.lat, lng: loc.lng };

    fetch(`${OSRM}/${loc.lng},${loc.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(j => {
        if (j.code !== 'Ok' || !j.routes?.length) return;
        const r0 = j.routes[0];
        setRoute({
          coords: r0.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
          distance: r0.distance,
          duration: r0.duration,
        });
      })
      .catch(() => { /* keep the previous route */ });
  }, [loc?.lat, loc?.lng, dest?.lat, dest?.lng, info?.status]);

  // ── Screens ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !info) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="font-black text-gray-800 mb-1">Order not found</h2>
        <p className="text-sm text-gray-400 mb-5">{err || 'We could not find this order in your account.'}</p>
        <Link href="/orders" className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm">Back to my orders</Link>
      </div>
    </div>
  );

  const active    = ACTIVE.includes(info.status);
  const delivered = info.status === 'delivered';
  const VehicleIcon = info.rider_vehicle === 'car' ? Car : Bike;

  const secondsAgo = loc ? Math.max(0, Math.round((nowTick - new Date(loc.updated_at).getTime()) / 1000)) : null;
  const stale = secondsAgo != null && secondsAgo > 60;

  const etaSeconds = route ? route.duration * TRAFFIC_FACTOR : null;
  const arriveAt = etaSeconds != null
    ? new Date(Date.now() + etaSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Top bar with the back arrow */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[800px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/orders" aria-label="Back to my orders"
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-black text-gray-900 leading-tight">Track Delivery</h1>
            <p className="text-xs text-gray-400 font-mono truncate">{info.order_number} · {info.store_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 py-4 space-y-4">
        {/* Not out for delivery yet */}
        {!active && !delivered && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <Clock className="w-10 h-10 text-orange-400 mx-auto mb-3" />
            <h2 className="font-black text-gray-900 mb-1">Tracking starts when your order is picked up</h2>
            <p className="text-sm text-gray-500">
              Current status: <span className="font-bold capitalize">{info.status.replace(/_/g, ' ')}</span>.
              This page will switch to the live map automatically.
            </p>
          </div>
        )}

        {/* Delivered */}
        {delivered && (
          <div className="bg-green-500 text-white rounded-2xl p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <h2 className="font-black text-xl">Delivered! 🎉</h2>
            <p className="text-sm text-green-100 mt-1">Your order has arrived. Enjoy!</p>
          </div>
        )}

        {/* Live map */}
        {active && (
          <>
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100" style={{ height: '55vh', minHeight: 320 }}>
              <TrackingMap rider={loc ? { lat: loc.lat, lng: loc.lng } : null} destination={dest} store={store} route={route?.coords ?? null} />

              {!loc && (
                <div className="absolute left-3 right-3 top-3 bg-white/95 rounded-xl shadow px-3 py-2 flex items-center gap-2 text-xs font-bold text-gray-600" style={{ zIndex: 1000 }}>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> Waiting for your rider's location...
                </div>
              )}
            </div>

            {stale && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Your rider's location was last updated {secondsAgo! >= 120 ? `${Math.round(secondsAgo! / 60)} minutes` : 'a minute'} ago. It may be out of signal.
              </div>
            )}

            {/* ETA + rider */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    {info.status === 'picked_up' ? 'Picked up' : 'On the way'}
                  </p>
                  {etaSeconds != null ? (
                    <>
                      <p className="text-3xl font-black text-gray-900 leading-tight">{fmtMins(etaSeconds)}</p>
                      <p className="text-sm text-gray-500">{route ? fmtDist(route.distance) : ''}{arriveAt ? ` · arrives ~${arriveAt}` : ''}</p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-gray-500 mt-1 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Calculating arrival time...
                    </p>
                  )}
                </div>
                {secondsAgo != null && !stale && (
                  <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                  </span>
                )}
              </div>

              {info.rider_name && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <VehicleIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 truncate">{info.rider_name}</p>
                    <p className="text-xs text-gray-400 capitalize truncate">
                      Your rider · {info.rider_vehicle}{info.rider_plate ? ` · ${info.rider_plate}` : ''}
                    </p>
                  </div>
                  {info.rider_phone && (
                    <a href={`tel:${info.rider_phone}`} aria-label="Call your rider"
                      className="w-11 h-11 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}

              {info.delivery_address && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>{info.delivery_address}{info.delivery_city ? `, ${info.delivery_city}` : ''}</span>
                </div>
              )}

              {!dest && (
                <p className="mt-3 text-xs text-amber-600 font-medium">
                  This order has no map pin for your address, so only your rider's position is shown.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}