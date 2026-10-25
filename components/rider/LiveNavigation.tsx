'use client';
// Picks the map engine. Set NEXT_PUBLIC_MAP_PROVIDER=google (plus NEXT_PUBLIC_GOOGLE_MAPS_KEY)
// to use Google Maps; anything else keeps the free OpenStreetMap/Leaflet version.
import dynamic from 'next/dynamic';
export type { NavTarget } from './LiveNavigationLeaflet';

const useGoogle = process.env.NEXT_PUBLIC_MAP_PROVIDER === 'google' && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

const Impl = useGoogle
  ? dynamic(() => import('./LiveNavigationGoogle'), { ssr: false })
  : dynamic(() => import('./LiveNavigationLeaflet'), { ssr: false });

export default Impl;