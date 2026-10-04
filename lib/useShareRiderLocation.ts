'use client';
// Sends the rider's GPS position to the database every few seconds while they are
// delivering, so the customer's tracking page can show them moving on the map.
//
// The database function only accepts a position when the order really belongs to this
// rider AND is picked_up / on_the_way, so sending extra updates is harmless.

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const SEND_EVERY_MS = 5000;   // how often a fresh position is sent
const HEARTBEAT_MS  = 20000;  // send even if the rider is standing still

export function useShareRiderLocation(orderIds: string[], enabled: boolean) {
  const key = orderIds.join(',');
  const latest = useRef<{ lat: number; lng: number; heading: number | null; ts: number } | null>(null);

  useEffect(() => {
    if (!enabled || !key || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const ids = key.split(',');
    let lastSent = 0;

    const watchId = navigator.geolocation.watchPosition(
      p => {
        latest.current = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          heading: p.coords.heading != null && !Number.isNaN(p.coords.heading) ? p.coords.heading : null,
          ts: Date.now(),
        };
      },
      () => { /* permission problems are shown by the navigation screen */ },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );

    const timer = setInterval(() => {
      const l = latest.current;
      if (!l) return;
      const now = Date.now();
      if (l.ts <= lastSent && now - lastSent < HEARTBEAT_MS) return; // nothing new yet
      lastSent = now;
      ids.forEach(id => {
        supabase
          .rpc('rider_update_location', { p_order_id: id, p_lat: l.lat, p_lng: l.lng, p_heading: l.heading })
          .then(({ error }) => { if (error) console.warn('Could not share location:', error.message); });
      });
    }, SEND_EVERY_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [key, enabled]);
}