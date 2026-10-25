// City / area search. ONE place to change the provider:
//   PLACES_PROVIDER=osm      (default, free, OpenStreetMap Nominatim)
//   PLACES_PROVIDER=google   (needs GOOGLE_MAPS_API_KEY with "Places API (New)" enabled)
// The rest of the app only ever calls searchCities().
import { rateLimit } from '@/lib/rateLimit';

export type PlaceHit = {
  city: string;            // what gets saved in the "city" field (e.g. Uyo, Mushin)
  state: string | null;    // e.g. Akwa Ibom
  address: string;         // street part if the result is a street/building, else ''
  label: string;           // what the person sees: "Abak Road, Uyo, Akwa Ibom"
  lat: number | null;
  lng: number | null;
};

// result types that ARE an area (the area itself becomes the city)
const AREA_KINDS = new Set([
  'city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'quarter',
  'city_district', 'borough', 'municipality', 'state_district', 'county',
]);

async function searchOsm(q: string): Promise<PlaceHit[]> {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    q, format: 'jsonv2', addressdetails: '1', countrycodes: 'ng', limit: '8', 'accept-language': 'en',
  });
  const res = await fetch(url, {
    // Nominatim's rules: identify your app. Set PLACES_CONTACT_EMAIL in your env.
    headers: { 'User-Agent': `Drovo/1.0 (${process.env.PLACES_CONTACT_EMAIL || 'contact@drovo.app'})` },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`OSM ${res.status}`);
  const rows: any[] = await res.json();
  const seen = new Set<string>();
  const out: PlaceHit[] = [];
  for (const d of rows) {
    const a = d.address ?? {};
    const kind = d.addresstype || d.type;
    const town = a.city || a.town || a.village || a.municipality || null;
    const state: string | null = a.state ?? null;
    const isArea = AREA_KINDS.has(kind);
    const own: string | undefined = d.name || undefined;

    const city: string | null = isArea
      ? (own ?? town)
      : (town || a.suburb || a.city_district || a.county || a.state_district || null);
    if (!city) continue;

    // "Abak Road, Ikot Ekpene, Uyo, Akwa Ibom" - no repeated parts
    const parts: string[] = [];
    for (const p of [own, a.suburb, town, state]) {
      if (p && !parts.some(x => x.toLowerCase() === String(p).toLowerCase())) parts.push(p);
    }
    const label = parts.join(', ');
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());

    out.push({
      city, state, label,
      address: isArea ? '' : [a.house_number, a.road ?? own].filter(Boolean).join(' '),
      lat: Number(d.lat), lng: Number(d.lon),
    });
  }
  return out;
}

async function searchGoogle(q: string): Promise<PlaceHit[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not set');
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ input: q, includedRegionCodes: ['ng'] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return (j.suggestions ?? []).map((s: any): PlaceHit | null => {
    const p = s.placePrediction;
    const main: string = p?.structuredFormat?.mainText?.text ?? '';
    const secondary: string = p?.structuredFormat?.secondaryText?.text ?? '';
    if (!main) return null;
    const bits = secondary.split(',').map((x: string) => x.trim()).filter((x: string) => x && x !== 'Nigeria');
    const isArea = (p?.types ?? []).some((t: string) => ['locality', 'sublocality', 'neighborhood', 'administrative_area_level_2'].includes(t));
    // Google gives text only (no coordinates) at this step - the map pin still sets those.
    return {
      city: isArea ? main : (bits[0] ?? main),
      state: bits.length > 1 ? bits[bits.length - 1] : null,
      address: isArea ? '' : main,
      label: [main, ...bits].join(', '),
      lat: null, lng: null,
    };
  }).filter(Boolean) as PlaceHit[];
}

// Remember answers for a day (the same few cities are searched again and again),
// and never call OSM more than once a second - that is their usage rule.
const cache = new Map<string, { at: number; hits: PlaceHit[] }>();
let lastOsmCall = 0;

export async function searchCities(rawQuery: string): Promise<PlaceHit[]> {
  const q = rawQuery.trim().toLowerCase().slice(0, 60);
  if (q.length < 2) return [];
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < 24 * 3600 * 1000) return hit.hits;

  const provider = (process.env.PLACES_PROVIDER || 'osm').toLowerCase();
  let hits: PlaceHit[];
  // Google is paid: stop after the daily cap (or if the counter is unreadable) and use free OpenStreetMap.
  const googleOk = provider === 'google' && !!process.env.GOOGLE_MAPS_API_KEY &&
    (await rateLimit('places:google:day', Number(process.env.PLACES_GOOGLE_DAILY_CAP || 2000), 86400, { failClosed: true })) === 0;
  let fromGoogle: PlaceHit[] | null = null;
  if (googleOk) {
    try { fromGoogle = await searchGoogle(q); }
    catch (e: any) { console.error('[places] Google failed, falling back to OpenStreetMap:', e?.message ?? e); }
  }
  if (fromGoogle) {
    hits = fromGoogle;
  } else {
    const wait = lastOsmCall + 1100 - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastOsmCall = Date.now();
    hits = await searchOsm(q);
  }
  if (cache.size > 500) cache.clear();
  cache.set(q, { at: Date.now(), hits });
  return hits;
}