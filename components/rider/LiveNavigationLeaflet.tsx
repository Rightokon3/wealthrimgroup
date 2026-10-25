'use client';
// Full-screen turn-by-turn style navigation on OpenStreetMap.
//  - Live position from the browser's GPS (watchPosition)
//  - Route + turn instructions from the public OSRM server
//  - Map follows the rider, ETA / distance update as they move
//  - Re-routes automatically if the rider leaves the route
// IMPORTANT: imports Leaflet, so load it with next/dynamic and { ssr: false }.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useShareRiderLocation } from '@/lib/useShareRiderLocation';
import { ArrowLeft, LocateFixed, Volume2, VolumeX, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export interface NavTarget {
  lat: number;
  lng: number;
  label: string;
  /** When set, the rider's live position is shared with this order's customer while delivering. */
  orderId?: string;
}

interface LatLng { lat: number; lng: number }
interface Step { distance: number; name: string; maneuver: { type: string; modifier?: string } }
interface Route {
  coords: [number, number][]; // [lat, lng]
  cum: number[];              // cumulative metres along coords
  total: number;              // metres, summed from coords
  distance: number;           // metres, from OSRM
  duration: number;           // seconds, from OSRM
  steps: Step[];
}

// The public OSRM demo server is fine for development and light use.
// For heavy production traffic, self-host OSRM or switch to a paid routing API.
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const TRAFFIC_FACTOR = 1.3;   // OSRM assumes free-flowing roads; pad the ETA for real traffic
const REROUTE_OFF_M  = 80;    // farther than this from the route => ask for a new one
const REFRESH_MS     = 30000; // refresh the route at least this often
const ARRIVE_M       = 60;    // closer than this => "you've arrived"

// Voice prompts are spoken as the rider closes in on each manoeuvre (metres)
const VOICE_STEPS = [2000, 1000, 500, 200];
const VOICE_NOW_M = 40; // final "Turn left now" prompt

// ── Icons ─────────────────────────────────────────────────────────────────
const riderIcon = L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<div style="width:22px;height:22px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25),0 2px 6px rgba(0,0,0,.4)"></div>',
});

const destIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

// ── Maths / formatting helpers ────────────────────────────────────────────
function dist(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearest(route: Route, pos: LatLng): { idx: number; d: number } {
  let idx = 0;
  let best = Infinity;
  for (let i = 0; i < route.coords.length; i++) {
    const d = dist(pos, { lat: route.coords[i][0], lng: route.coords[i][1] });
    if (d < best) { best = d; idx = i; }
  }
  return { idx, d: best };
}

function fmtDist(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtDuration(sec: number): string {
  const mins = Math.max(1, Math.round(sec / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function describe(m: Step['maneuver'], name: string): { icon: string; text: string } {
  const mod = m.modifier ?? '';
  const icons: Record<string, string> = {
    left: '⬅️', 'slight left': '↖️', 'sharp left': '↙️',
    right: '➡️', 'slight right': '↗️', 'sharp right': '↘️',
    straight: '⬆️', uturn: '↩️',
  };
  const icon = icons[mod] ?? '⬆️';
  const onto = name ? ` onto ${name}` : '';
  switch (m.type) {
    case 'arrive':     return { icon: '🏁', text: 'Arrive at destination' };
    case 'depart':     return { icon: '⬆️', text: name ? `Head out on ${name}` : 'Head out' };
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn': return { icon: '🔄', text: `Take the roundabout${onto}` };
    case 'merge':      return { icon, text: `Merge${mod ? ' ' + mod : ''}${onto}` };
    case 'fork':       return { icon, text: `Keep ${mod || 'straight'}${onto}` };
    case 'end of road':return { icon, text: `Turn ${mod || 'around'} at the end of the road${onto}` };
    case 'turn':       return { icon, text: mod === 'uturn' ? 'Make a U-turn' : `Turn ${mod}${onto}` };
    default:           return { icon, text: `Continue${mod && mod !== 'straight' ? ' ' + mod : ''}${onto}` };
  }
}

async function fetchRoute(from: LatLng, to: LatLng): Promise<Route> {
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Routing service unavailable');
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('No route found');

  const r = json.routes[0];
  const coords: [number, number][] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + dist(
      { lat: coords[i - 1][0], lng: coords[i - 1][1] },
      { lat: coords[i][0], lng: coords[i][1] },
    ));
  }
  const steps: Step[] = (r.legs?.[0]?.steps ?? []).map((s: any) => ({
    distance: s.distance,
    name: s.name ?? '',
    maneuver: { type: s.maneuver?.type, modifier: s.maneuver?.modifier },
  }));

  return { coords, cum, total: cum[cum.length - 1] || 0, distance: r.distance, duration: r.duration, steps };
}

function speak(text: string) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    window.speechSynthesis.speak(u);
  } catch { /* speech not supported */ }
}

// "2 kilometres", "1.5 kilometres", "800 metres"
function spokenDist(m: number): string {
  if (m >= 950) {
    const km = Math.round(m / 100) / 10;
    return `${km} ${km === 1 ? 'kilometre' : 'kilometres'}`;
  }
  const r = m >= 100 ? Math.round(m / 50) * 50 : Math.max(10, Math.round(m / 10) * 10);
  return `${r} metres`;
}

function spokenDuration(sec: number): string {
  const mins = Math.max(1, Math.round(sec / 60));
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} ${h === 1 ? 'hour' : 'hours'}${m ? ` ${m} minutes` : ''}`;
}

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// ── Map helper: keeps the camera on the rider until they drag the map ─────
function FollowRider({ pos, follow, onUserDrag }: { pos: LatLng | null; follow: boolean; onUserDrag: () => void }) {
  const map = useMap();
  useMapEvents({ dragstart: () => onUserDrag() });
  useEffect(() => {
    if (follow && pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 17), { animate: true });
  }, [follow, pos, map]);
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function LiveNavigation({ target, onClose }: { target: NavTarget; onClose: () => void }) {
  const [pos,      setPos]      = useState<LatLng | null>(null);
  const [geoErr,   setGeoErr]   = useState('');
  const [route,    setRoute]    = useState<Route | null>(null);
  const [routeErr, setRouteErr] = useState('');
  const [follow,   setFollow]   = useState(true);
  // Voice is ON by default and the rider's choice is remembered
  const [voice, setVoice] = useState<boolean>(() => {
    try { return localStorage.getItem('drovo_nav_voice') !== '0'; } catch { return true; }
  });
  const [tick,     setTick]     = useState(0);

  const lastFetch  = useRef(0);
  const fetching   = useRef(false);
  const spoken     = useRef<{ key: string; done: Set<number> }>({ key: '', done: new Set() });
  const spokeArriv = useRef(false);
  const voiceRef   = useRef(voice);
  const startedRef = useRef(false);

  useEffect(() => { voiceRef.current = voice; }, [voice]);

  const dest = useMemo<LatLng>(() => ({ lat: target.lat, lng: target.lng }), [target.lat, target.lng]);

  // Lets the customer watch this rider on their tracking page (only works once the order is picked up)
  useShareRiderLocation(target.orderId ? [target.orderId] : [], true);

  // Live GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGeoErr('This device does not support GPS.'); return; }
    const id = navigator.geolocation.watchPosition(
      p => { setGeoErr(''); setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      err => setGeoErr(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Allow location for this site in your browser settings.'
          : 'Waiting for a GPS signal...'
      ),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Heartbeat so retries still happen when the rider is standing still
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Keep the screen awake while navigating (where the browser supports it)
  useEffect(() => {
    let lock: any;
    (async () => {
      try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* ignore */ }
    })();
    return () => { try { lock?.release(); } catch { /* ignore */ } };
  }, []);

  // Lock the page behind the map while navigating
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Stop any speech when leaving
  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }, []);

  // Fetch / refresh / re-route
  useEffect(() => {
    if (!pos || fetching.current) return;
    const now = Date.now();
    const off = route ? nearest(route, pos).d > REROUTE_OFF_M : false;
    const due = !route || now - lastFetch.current > REFRESH_MS || (off && now - lastFetch.current > 8000);
    if (!due) return;

    if (route && off && voiceRef.current) speak('Recalculating');

    fetching.current = true;
    lastFetch.current = now;
    fetchRoute(pos, dest)
      .then(r => {
        setRoute(r);
        setRouteErr('');
        if (!startedRef.current) {
          startedRef.current = true;
          if (voiceRef.current) {
            speak(`Starting navigation to ${target.label}. ${spokenDist(r.distance)}, about ${spokenDuration(r.duration * TRAFFIC_FACTOR)}.`);
          }
        }
      })
      .catch(() => {
        setRouteErr('Could not load the route. Retrying...');
        lastFetch.current = Date.now() - REFRESH_MS + 5000; // retry in ~5s
      })
      .finally(() => { fetching.current = false; });
  }, [pos, dest, route, tick]);

  // Everything the panels show, derived from position + route
  const nav = useMemo(() => {
    if (!pos) return null;
    const straight = dist(pos, dest);
    if (!route || route.total === 0) {
      return { straight, remaining: straight, seconds: null as number | null, instr: null as null | { icon: string; text: string; distance: number; key: string } };
    }

    const { idx } = nearest(route, pos);
    const remaining = Math.max(0, route.total - route.cum[idx]);
    const seconds = route.duration * (remaining / route.total) * TRAFFIC_FACTOR;
    const traveled = route.cum[idx] * (route.distance / route.total);

    let instr: null | { icon: string; text: string; distance: number; key: string } = null;
    let acc = 0;
    for (let k = 0; k < route.steps.length; k++) {
      const end = acc + route.steps[k].distance;
      const isLast = k === route.steps.length - 1;
      if (traveled < end || isLast) {
        const next = route.steps[k + 1];
        const d = next ? describe(next.maneuver, next.name) : { icon: '🏁', text: 'Arrive at destination' };
        instr = { ...d, distance: Math.max(0, end - traveled), key: `${k}` };
        break;
      }
      acc = end;
    }
    return { straight, remaining, seconds, instr };
  }, [pos, route, dest]);

  const arrived = !!nav && nav.straight < ARRIVE_M;

  // Voice guidance, Google-style: "In 2 kilometres, turn left" ... then again at
  // 1 km, 500 m, 200 m, and finally "Turn left onto ..." right at the junction.
  useEffect(() => {
    if (!voice || !nav) return;
    if (arrived) {
      if (!spokeArriv.current) { spokeArriv.current = true; speak('You have arrived at your destination.'); }
      return;
    }
    const i = nav.instr;
    if (!i) return;

    const isArrive = i.text.startsWith('Arrive');
    const say = (m: number) => speak(
      isArrive
        ? `You will arrive at your destination in ${spokenDist(m)}`
        : `In ${spokenDist(m)}, ${lowerFirst(i.text)}`
    );

    // A new manoeuvre just came up: announce it straight away
    if (spoken.current.key !== i.key) {
      const done = new Set<number>();
      VOICE_STEPS.forEach(t => { if (i.distance <= t) done.add(t); }); // already inside these
      spoken.current = { key: i.key, done };
      if (i.distance > 120) { say(i.distance); return; }
    }

    // Final prompt at the junction
    if (i.distance <= VOICE_NOW_M && !spoken.current.done.has(0)) {
      spoken.current.done.add(0);
      if (!isArrive) speak(i.text);
      return;
    }

    // Reminder prompts at 2 km, 1 km, 500 m, 200 m
    for (const t of VOICE_STEPS) {
      if (i.distance <= t && !spoken.current.done.has(t)) {
        VOICE_STEPS.forEach(x => { if (x >= t) spoken.current.done.add(x); });
        say(t);
        return;
      }
    }
  }, [voice, nav, arrived]);

  const arriveAt = nav?.seconds != null
    ? new Date(Date.now() + nav.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Rendered into <body> so no page layout (sticky headers, transforms) can sit on top of it
  return createPortal(
    <div
      className="bg-gray-900"
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 2147483000, isolation: 'isolate' }}
    >
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer
          center={[dest.lat, dest.lng]}
          zoom={16}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          {route && <Polyline positions={route.coords} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.85 }} />}
          <Marker position={[dest.lat, dest.lng]} icon={destIcon} />
          {pos && <Marker position={[pos.lat, pos.lng]} icon={riderIcon} zIndexOffset={1000} />}
          <FollowRider pos={pos} follow={follow} onUserDrag={() => setFollow(false)} />
        </MapContainer>
      </div>

      {/* Top: next instruction */}
      <div className="absolute top-0 inset-x-0 p-3" style={{ zIndex: 1100, paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="max-w-lg mx-auto bg-gray-950/95 text-white rounded-2xl shadow-xl px-3 py-3 flex items-center gap-3">
          {/* Back arrow: closes the map and returns to the screen the rider came from */}
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-11 h-11 rounded-full bg-white text-gray-900 hover:bg-gray-200 active:scale-95 flex items-center justify-center flex-shrink-0 shadow-md transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {arrived ? (
            <CheckCircle className="w-9 h-9 text-green-400 flex-shrink-0" />
          ) : nav?.instr ? (
            <div className="text-3xl leading-none flex-shrink-0">{nav.instr.icon}</div>
          ) : (
            <Loader2 className="w-7 h-7 animate-spin text-gray-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {arrived ? (
              <div className="font-black text-base">You've arrived</div>
            ) : nav?.instr ? (
              <>
                <div className="text-xs text-gray-400 font-semibold">in {fmtDist(nav.instr.distance)}</div>
                <div className="font-black text-base leading-tight truncate">{nav.instr.text}</div>
              </>
            ) : (
              <div className="font-bold text-sm text-gray-300">
                {pos ? 'Finding the best route...' : 'Getting your location...'}
              </div>
            )}
          </div>
        </div>

        {(geoErr || routeErr) && (
          <div className="max-w-lg mx-auto mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{geoErr || routeErr}</span>
          </div>
        )}
      </div>

      {/* Re-center button */}
      {!follow && pos && (
        <button
          onClick={() => setFollow(true)}
          className="absolute right-4 bottom-44 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-blue-600"
          style={{ zIndex: 1100 }}
          aria-label="Re-center on me"
        >
          <LocateFixed className="w-6 h-6" />
        </button>
      )}

      {/* Bottom: ETA panel */}
      <div className="absolute bottom-0 inset-x-0 p-3" style={{ zIndex: 1100, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold truncate">Heading to {target.label}</p>

          {arrived ? (
            <div className="mt-2">
              <p className="font-black text-green-700 text-lg">You've arrived at {target.label} 🎉</p>
              <button onClick={onClose}
                className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div>
                  {nav?.seconds != null ? (
                    <>
                      <div className="text-3xl font-black text-gray-900 leading-none">{fmtDuration(nav.seconds)}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {fmtDist(nav.remaining)}{arriveAt ? ` · arrive ${arriveAt}` : ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-bold text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Calculating ETA...
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const next = !voice;
                    setVoice(next);
                    try { localStorage.setItem('drovo_nav_voice', next ? '1' : '0'); } catch { /* ignore */ }
                    spoken.current = { key: '', done: new Set() };
                    if (next) speak('Voice guidance on'); else { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border ${voice ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                  aria-label={voice ? 'Turn voice guidance off' : 'Turn voice guidance on'}
                >
                  {voice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>
              <button onClick={onClose}
                className="mt-3 w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                End navigation
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}