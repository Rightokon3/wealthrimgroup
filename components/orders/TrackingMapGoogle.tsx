'use client';
// Google Maps version of the customer's live delivery map (same props as the Leaflet one).

import { useEffect, useRef, useState } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { LocateFixed } from 'lucide-react';
import { MapsProvider, MAP_ID, RoutePolyline, BlueDot, PULSE_CSS } from '@/components/maps/GoogleMapsKit';

interface LatLng { lat: number; lng: number }

interface Props {
  rider: LatLng | null;
  destination: LatLng | null;
  store: LatLng | null;
  route: [number, number][] | null; // [lat, lng] pairs
}

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

  return (
    <AdvancedMarker position={shown} zIndex={1000}>
      <BlueDot pulse />
    </AdvancedMarker>
  );
}

// Keeps the rider and the destination in view until the customer moves the map
function AutoFit({ points, enabled }: { points: LatLng[]; enabled: boolean }) {
  const map = useMap();
  const key = points.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');

  useEffect(() => {
    if (!map || !enabled || points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(16);
      return;
    }
    const b = new google.maps.LatLngBounds();
    points.forEach(p => b.extend(p));
    map.fitBounds(b, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, map]);

  return null;
}

export default function TrackingMapGoogle({ rider, destination, store, route }: Props) {
  const [follow, setFollow] = useState(true);

  const points: LatLng[] = rider
    ? [rider, ...(destination ? [destination] : [])]
    : [...(destination ? [destination] : []), ...(store ? [store] : [])];

  const center = rider ?? destination ?? store ?? { lat: 9.082, lng: 8.6753 };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0, isolation: 'isolate' }}>
      <style>{PULSE_CSS}</style>

      <MapsProvider>
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={15}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          style={{ height: '100%', width: '100%' }}
          onDragstart={() => setFollow(false)}
        >
          <RoutePolyline path={route && route.length > 1 ? route : null} opacity={0.8} />
          {store && (
            <AdvancedMarker position={store}>
              <div style={{ fontSize: 24, lineHeight: '24px' }}>🏪</div>
            </AdvancedMarker>
          )}
          {destination && (
            <AdvancedMarker position={destination}>
              <div style={{ fontSize: 28, lineHeight: '28px' }}>🏠</div>
            </AdvancedMarker>
          )}
          {rider && <SmoothRider target={rider} />}
          <AutoFit points={points} enabled={follow} />
        </Map>
      </MapsProvider>

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