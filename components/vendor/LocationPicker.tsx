'use client';
// IMPORTANT: this file imports Leaflet, which needs `window`.
// Always load it with next/dynamic and { ssr: false } (the setup page does this).

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Search, Loader2, MapPin } from 'lucide-react';
import { searchPlaces, reverseGeocode, PlaceResult } from '@/lib/geocoding';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
}

interface Props {
  value: { latitude: number; longitude: number } | null;
  onChange: (loc: PickedLocation) => void;
  /** Increase this number from the parent to trigger "use my current location". */
  locateSignal?: number;
}

// Default Leaflet marker icons break under bundlers, so point at the CDN copies.
const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

const NIGERIA_CENTER: [number, number] = [9.082, 8.6753];
const round = (n: number) => Math.round(n * 1e6) / 1e6;

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Only moves the camera for search / GPS, not when the user taps or drags the pin.
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 17), { duration: 1 });
  }, [target, map]);
  return null;
}

export default function LocationPicker({ value, onChange, locateSignal }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState('');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  async function pick(lat: number, lng: number, fly = false) {
    const latitude = round(lat);
    const longitude = round(lng);
    onChange({ latitude, longitude });            // pin appears immediately
    if (fly) setFlyTarget([latitude, longitude]);
    const r = await reverseGeocode(latitude, longitude);
    if (r) onChange({ latitude, longitude, ...r }); // then auto-fill the address text
  }

  async function runSearch() {
    if (query.trim().length < 3) { setMsg('Type at least 3 characters.'); return; }
    setSearching(true); setMsg(''); setResults([]);
    try {
      const r = await searchPlaces(query);
      setResults(r);
      if (r.length === 0) setMsg('No results. Try a nearby landmark, or tap the map to drop the pin.');
    } catch (e: any) {
      setMsg(e.message ?? 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) { setMsg('Your browser does not support location.'); return; }
    setLocating(true); setMsg('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        pick(pos.coords.latitude, pos.coords.longitude, true);
      },
      err => {
        setLocating(false);
        setMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow it in your browser settings, or search / tap the map instead.'
            : 'Could not get your location. Try again, or search / tap the map instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // Lets a parent button (e.g. "Use my location" on checkout) trigger GPS.
  useEffect(() => {
    if (locateSignal) locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateSignal]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
            placeholder="Search address or landmark..."
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white"
          />
          <button type="button" onClick={runSearch} disabled={searching}
            className="px-4 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
        <button type="button" onClick={locateMe} disabled={locating}
          className="px-4 py-3 rounded-xl border border-orange-200 text-orange-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-50 disabled:opacity-60">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          Use my current location
        </button>
      </div>

      {results.length > 0 && (
        <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button"
                onClick={() => { pick(r.lat, r.lng, true); setResults([]); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {msg && <p className="text-xs text-orange-600">{msg}</p>}

      <div className="rounded-2xl overflow-hidden border border-gray-200 relative z-0" style={{ height: 320, zIndex: 0, isolation: 'isolate' }}>
        <MapContainer
          center={value ? [value.latitude, value.longitude] : NIGERIA_CENTER}
          zoom={value ? 17 : 6}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ClickToPlace onPick={(lat, lng) => pick(lat, lng)} />
          <FlyTo target={flyTarget} />
          {value && (
            <Marker
              position={[value.latitude, value.longitude]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: e => {
                  const p = (e.target as L.Marker).getLatLng();
                  pick(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-400">
        {value
          ? <>Pinned: <span className="font-mono">{value.latitude}, {value.longitude}</span>. Drag the pin to adjust it.</>
          : 'Tap the map to drop a pin, or use the buttons above. Stand at your shop for the most accurate spot.'}
      </p>
    </div>
  );
}