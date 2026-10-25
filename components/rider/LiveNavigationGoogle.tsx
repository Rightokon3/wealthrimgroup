'use client';
// Full-screen turn-by-turn style navigation on OpenStreetMap.
//  - Live position from the browser's GPS (watchPosition)
//  - Route + turn instructions from the public OSRM server
//  - Map follows the rider, ETA / distance update as they move
//  - Re-routes automatically if the rider leaves the route
// Google Maps version (same props as the Leaflet one). Routing still uses OSRM.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { MapsProvider, MAP_ID, RoutePolyline, BlueDot } from '@/components/maps/GoogleMapsKit';
import { useShareRiderLocation } from '@/lib/useShareRiderLocation';
import { ArrowLeft, LocateFixed, Volume2, VolumeX, Loader2, AlertCircle, CheckCircle, Navigation2, Map as MapIcon } from 'lucide-react';

import type { NavTarget } from './LiveNavigationLeaflet';
export type { NavTarget };

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

// ── Driving-view helpers ──────────────────────────────────────────────────
const DRIVE_ZOOM = 18.5;
const DRIVE_TILT = 60;     // degrees; 0 = flat top-down, 60 = looking ahead with 3D buildings
const LOOK_AHEAD_M = 60;   // puts the rider in the lower part of the screen, like Google

function bearing(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function offsetPoint(p: LatLng, meters: number, brg: number): LatLng {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180, deg = (r: number) => (r * 180) / Math.PI;
  const d = meters / R, b = rad(brg), la = rad(p.lat), lo = rad(p.lng);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: deg(la2), lng: deg(lo2) };
}

const angleDiff = (from: number, to: number) => ((to - from + 540) % 360) - 180; // shortest turn, -180..180

// ── Map helper: overview mode keeps the camera on the rider until they drag the map ──
function FollowRider({ pos, follow }: { pos: LatLng | null; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !follow || !pos) return;
    map.panTo({ lat: pos.lat, lng: pos.lng });
    if ((map.getZoom() ?? 0) < 17) map.setZoom(17);
  }, [follow, pos, map]);
  return null;
}

// ── Driving camera: tilted 3D view that turns with the rider, eased every frame ──
function DriveCamera({ active, follow, pos, heading, camHeading, onRaster }: {
  active: boolean; follow: boolean; pos: LatLng | null; heading: number; camHeading: { current: number }; onRaster: (raster: boolean) => void;
}) {
  const map = useMap();
  const target = useRef({ pos, heading });
  target.current = { pos, heading };
  const cam = useRef<{ lat: number; lng: number; h: number } | null>(null);

  // Enter / leave driving view
  useEffect(() => {
    if (!map) return;
    if (active) {
      map.moveCamera({ zoom: DRIVE_ZOOM, tilt: DRIVE_TILT });
      // Tilt / turn only exist on VECTOR maps. If Google gives us a raster map, say so on screen.
      const t = setTimeout(() => onRaster(map.getRenderingType?.() === 'RASTER'), 2500);
      return () => clearTimeout(t);
    } else {
      onRaster(false);
      cam.current = null;
      camHeading.current = 0;
      map.moveCamera({ tilt: 0, heading: 0 });
    }
  }, [map, active, camHeading, onRaster]);

  // Smooth follow loop
  useEffect(() => {
    if (!map || !active || !follow) return;
    let raf = 0;
    const loop = () => {
      const { pos: p, heading: h } = target.current;
      if (p) {
        const ahead = offsetPoint(p, LOOK_AHEAD_M, h);
        if (!cam.current) cam.current = { lat: ahead.lat, lng: ahead.lng, h };
        const c = cam.current;
        c.lat += (ahead.lat - c.lat) * 0.12;
        c.lng += (ahead.lng - c.lng) * 0.12;
        c.h = (c.h + angleDiff(c.h, h) * 0.08 + 360) % 360;
        camHeading.current = c.h;
        map.moveCamera({ center: { lat: c.lat, lng: c.lng }, heading: c.h, tilt: DRIVE_TILT });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map, active, follow, camHeading]);

  return null;
}

// Blue navigation arrow. The map turns to face the rider's heading, so the arrow
// stays pointing up, and swings a little while the camera catches up in a turn.
function DriveArrow({ heading, camHeading }: { heading: number; camHeading: { current: number } }) {
  const el = useRef<HTMLDivElement>(null);
  const hRef = useRef(heading);
  hRef.current = heading;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (el.current) el.current.style.transform = `rotate(${hRef.current - camHeading.current}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camHeading]);
  return (
    <div ref={el} style={{ width: 48, height: 48, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.45))' }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="rgba(37,99,235,.18)" />
        <path d="M24 6 L37 40 L24 32 L11 40 Z" fill="#2563eb" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────
export default function LiveNavigationGoogle({ target, onClose }: { target: NavTarget; onClose: () => void }) {
  const [pos,      setPos]      = useState<LatLng | null>(null);
  const [geoErr,   setGeoErr]   = useState('');
  const [route,    setRoute]    = useState<Route | null>(null);
  const [routeErr, setRouteErr] = useState('');
  const [follow,   setFollow]   = useState(true);
  const [driving,  setDriving]  = useState(false);        // Start pressed: 3D heading-up view
  const [heading,  setHeading]  = useState<number | null>(null); // rider's direction of travel (degrees)
  const prevPos    = useRef<LatLng | null>(null);
  const camHeading = useRef(0);
  const [rasterWarn, setRasterWarn] = useState(false);
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
      p => {
        setGeoErr('');
        const np = { lat: p.coords.latitude, lng: p.coords.longitude };
        // Direction: the phone's own heading while moving, else the bearing between the last two spots
        let h: number | null =
          p.coords.heading != null && !Number.isNaN(p.coords.heading) && (p.coords.speed ?? 0) > 1 ? p.coords.heading : null;
        const prev = prevPos.current;
        const moved = !prev || dist(prev, np) > 6;
        if (h == null && prev && moved) h = bearing(prev, np);
        if (moved) prevPos.current = np;
        if (h != null) setHeading(h);
        setPos(np);
      },
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

  // Direction the camera should face: GPS heading, else the road ahead on the route
  const faceHeading = useMemo(() => {
    if (heading != null) return heading;
    if (pos && route && route.coords.length > 1) {
      const { idx } = nearest(route, pos);
      const a = route.coords[idx], b = route.coords[Math.min(idx + 5, route.coords.length - 1)];
      return bearing({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
    }
    return 0;
  }, [heading, pos, route]);

  useEffect(() => { if (arrived) setDriving(false); }, [arrived]);

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
        <MapsProvider>
          <Map
            mapId={MAP_ID}
            defaultCenter={{ lat: dest.lat, lng: dest.lng }}
            defaultZoom={16}
            gestureHandling="greedy"
            disableDefaultUI
            style={{ height: '100%', width: '100%' }}
            onDragstart={() => setFollow(false)}
          >
            <RoutePolyline path={route ? route.coords : null} color="#ffffff" weight={10} opacity={0.95} />
            <RoutePolyline path={route ? route.coords : null} color="#1a73e8" weight={6} opacity={1} />
            <AdvancedMarker position={{ lat: dest.lat, lng: dest.lng }}>
              <Pin background="#f97316" borderColor="#c2410c" glyphColor="#fff" />
            </AdvancedMarker>
            {pos && (
              <AdvancedMarker position={{ lat: pos.lat, lng: pos.lng }} zIndex={1000}>
                {driving ? <DriveArrow heading={faceHeading} camHeading={camHeading} /> : <BlueDot />}
              </AdvancedMarker>
            )}
            <FollowRider pos={pos} follow={follow && !driving} />
            <DriveCamera active={driving} follow={follow} pos={pos} heading={faceHeading} camHeading={camHeading} onRaster={setRasterWarn} />
          </Map>
        </MapsProvider>
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

        {driving && rasterWarn && (
          <div className="max-w-lg mx-auto mt-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-3 py-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>3D view needs a Vector map. In Google Cloud, open Map Management, create a Map ID with type JavaScript, Vector, and Tilt and Rotation turned on, then set NEXT_PUBLIC_GOOGLE_MAP_ID to it.</span>
          </div>
        )}

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
              {pos && route && (
                driving ? (
                  <button onClick={() => setDriving(false)}
                    className="mt-3 w-full py-3 rounded-xl border-2 border-blue-200 text-blue-700 font-black text-sm hover:bg-blue-50 flex items-center justify-center gap-2">
                    <MapIcon className="w-4 h-4" /> Overview
                  </button>
                ) : (
                  <button onClick={() => { setFollow(true); setDriving(true); }}
                    className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-sm shadow-md active:scale-[0.99] flex items-center justify-center gap-2">
                    <Navigation2 className="w-4 h-4" /> Start
                  </button>
                )
              )}
              <button onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
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