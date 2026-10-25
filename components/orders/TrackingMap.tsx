'use client';
// Picks the map engine. Set NEXT_PUBLIC_MAP_PROVIDER=google (plus NEXT_PUBLIC_GOOGLE_MAPS_KEY)
// to use Google Maps; anything else keeps the free OpenStreetMap/Leaflet version.
import dynamic from 'next/dynamic';


const useGoogle = process.env.NEXT_PUBLIC_MAP_PROVIDER === 'google' && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

const Impl = useGoogle
  ? dynamic(() => import('./TrackingMapGoogle'), { ssr: false })
  : dynamic(() => import('./TrackingMapLeaflet'), { ssr: false });

export default Impl;