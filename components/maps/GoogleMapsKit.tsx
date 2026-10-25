'use client';
// Shared pieces for the Google Maps versions of Drovo's maps.
// Needs:  npm i @vis.gl/react-google-maps
// Env:    NEXT_PUBLIC_GOOGLE_MAPS_KEY  (browser key, restricted to your website addresses)
//         NEXT_PUBLIC_GOOGLE_MAP_ID    (optional; falls back to Google's demo id)

import { useEffect, type ReactNode } from 'react';
import { APIProvider, useMap } from '@vis.gl/react-google-maps';

export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
// AdvancedMarker needs a Map ID. DEMO_MAP_ID works for testing; create your own in Google Cloud for production.
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID';

export function MapsProvider({ children }: { children: ReactNode }) {
  if (!GOOGLE_KEY) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 text-center text-xs text-red-600 bg-red-50">
        Google Maps key missing. Set NEXT_PUBLIC_GOOGLE_MAPS_KEY and restart the server.
      </div>
    );
  }
  return <APIProvider apiKey={GOOGLE_KEY}>{children}</APIProvider>;
}

/** Draws a line on the map. Path is [lat, lng] pairs. */
export function RoutePolyline({
  path, color = '#2563eb', weight = 6, opacity = 0.85,
}: { path: [number, number][] | null; color?: string; weight?: number; opacity?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !path || path.length < 2) return;
    const line = new google.maps.Polyline({
      path: path.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: color, strokeOpacity: opacity, strokeWeight: weight, map,
    });
    return () => line.setMap(null);
  }, [map, path, color, weight, opacity]);
  return null;
}

/** Blue "you are here" dot. pulse=true adds the animated ring (see PULSE_CSS). */
export function BlueDot({ pulse = false }: { pulse?: boolean }) {
  return (
    <div className={pulse ? 'drovo-rider' : undefined}
      style={pulse ? undefined : { width: 22, height: 22, borderRadius: 9999, background: '#2563eb', border: '3px solid #fff', boxShadow: '0 0 0 6px rgba(37,99,235,.25),0 2px 6px rgba(0,0,0,.4)' }} />
  );
}

export const PULSE_CSS = `
.drovo-rider{position:relative;width:22px;height:22px}
.drovo-rider::before{content:'';position:absolute;left:-11px;top:-11px;width:44px;height:44px;border-radius:9999px;background:rgba(37,99,235,.28);animation:drovoPulse 1.8s ease-out infinite}
.drovo-rider::after{content:'';position:absolute;left:0;top:0;width:22px;height:22px;box-sizing:border-box;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
@keyframes drovoPulse{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.6);opacity:0}}
`;