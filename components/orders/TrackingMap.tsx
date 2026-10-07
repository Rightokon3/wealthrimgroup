'use client';
// Live delivery map for the customer: pulsing blue dot (the rider) gliding along the route
// to the customer's pin. IMPORTANT: imports Leaflet, so load it with next/dynamic { ssr: false }.

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';

interface LatLng { lat: number; lng: number }

interface Props {
  rider: LatLng | null;
  destination: LatLng | null;
  store: LatLng | null;
  route: [number, number][] | null; // [lat, lng] pairs
}

// Google-Maps style blue dot with a pulsing ring (styled by the CSS below)
const riderIcon = L.divIcon({ className: 'drovo-rider', iconSize: [22, 22], iconAnchor: [11, 11] });

// Leaflet markers are plain HTML, so the Lucide icons are inlined as SVG paths
// (same geometry as lucide's `house` and `store` icons) inside a round badge.
const LUCIDE_HOME = '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
const LUCIDE_STORE =
  '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>' +
  '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>' +
  '<path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>' +
  '<path d="M2 7h20"/>' +
  '<path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>';

function badgeIcon(svgInner: string, background: string, size = 36) {
  return L.divIcon({
    className: '',
    html:
      `<div style="width:${size}px;height:${size}px;box-sizing:border-box;border-radius:9999px;` +
      `background:${background};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);` +
      `display:flex;align-items:center;justify-content:center">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" ` +
      `stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const homeIcon  = badgeIcon(LUCIDE_HOME,  '#ea580c'); // customer's pin (orange)
const storeIcon = badgeIcon(LUCIDE_STORE, '#111827'); // vendor (dark)

const CSS = `
.drovo-rider{position:relative}
.drovo-rider::before{content:'';position:absolute;left:-11px;top:-11px;width:44px;height:44px;border-radius:9999px;background:rgba(37,99,235,.28);animation:drovoPulse 1.8s ease-out infinite}
.drovo-rider::after{content:'';position:absolute;left:0;top:0;width:22px;height:22px;box-sizing:border-box;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
@keyframes drovoPulse{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.6);opacity:0}}
`;

// Glides the dot to each new position instead of jumping
function SmoothRider({ target }: { target: LatLng }) {
  const shownRef = useRef<LatLng>(target);
  const [shown, setShown] = useState<LatLng>(target);

  useEffect(() => {
    const from = shownRef.current;
    const t0 = performance.now();
    const DURATION = 1500;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / DURATION);
      const p = { lat: from.lat + (target.lat - from.lat) * k, lng: from.lng + (target.lng - from.lng) * k };
      shownRef.current = p;
      setShown(p);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target.lat, target.lng]);

  return <Marker position={[shown.lat, shown.lng]} icon={riderIcon} zIndexOffset={1000} />;
}

// Keeps the rider and the destination in view until the customer moves the map
function AutoFit({ points, enabled, onUserDrag }: { points: LatLng[]; enabled: boolean; onUserDrag: () => void }) {
  const map = useMap();
  useMapEvents({ dragstart: () => onUserDrag() });
  const key = points.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');

  useEffect(() => {
    if (!enabled || points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16, { animate: true });
      return;
    }
    map.fitBounds(points.map(p => [p.lat, p.lng] as [number, number]), { padding: [60, 60], maxZoom: 17, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, map]);

  return null;
}

export default function TrackingMap({ rider, destination, store, route }: Props) {
  const [follow, setFollow] = useState(true);

  const points: LatLng[] = rider
    ? [rider, ...(destination ? [destination] : [])]
    : [...(destination ? [destination] : []), ...(store ? [store] : [])];

  const center = rider ?? destination ?? store ?? { lat: 9.082, lng: 8.6753 };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0, isolation: 'isolate' }}>
      <style>{CSS}</style>

      <MapContainer center={[center.lat, center.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {route && route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.8 }} />
        )}
        {store && <Marker position={[store.lat, store.lng]} icon={storeIcon} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={homeIcon} />}
        {rider && <SmoothRider target={rider} />}
        <AutoFit points={points} enabled={follow} onUserDrag={() => setFollow(false)} />
      </MapContainer>

      {!follow && (
        <button
          onClick={() => setFollow(true)}
          aria-label="Show rider and destination"
          className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center text-blue-600"
          style={{ zIndex: 1000 }}
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}