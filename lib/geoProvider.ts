// SERVER-ONLY map lookups for the map's search box and pin-drop address.
// The browser never talks to OpenStreetMap / Google directly any more, so we can
// limit it, remember answers, and cap the daily Google spend.
//
//   PLACES_PROVIDER=osm (default)  or  google (needs GOOGLE_MAPS_API_KEY)
//   GEO_GOOGLE_DAILY_CAP=3000      max Google lookups per day; after that it uses free OpenStreetMap
import { rateLimit } from '@/lib/rateLimit';

export interface PlaceResult { lat: number; lng: number; label: string }
export interface ReverseResult { address: string; city: string; state: string }

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const UA = `Drovo/1.0 (${process.env.PLACES_CONTACT_EMAIL || 'contact@drovo.app'})`;
const DAY = 24 * 3600 * 1000;

const searchCache = new Map<string, { at: number; v: PlaceResult[] }>();
const reverseCache = new Map<string, { at: number; v: ReverseResult | null }>();
let lastOsmCall = 0;

async function osmGate() {                       // OpenStreetMap rule: at most 1 request per second
  const wait = lastOsmCall + 1100 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastOsmCall = Date.now();
}

async function useGoogle(): Promise<boolean> {
  if ((process.env.PLACES_PROVIDER || 'osm').toLowerCase() !== 'google') return false;
  if (!process.env.GOOGLE_MAPS_API_KEY) return false;
  const cap = Number(process.env.GEO_GOOGLE_DAILY_CAP || 3000);
  // failClosed: if the counter cannot be read, do NOT spend money - use free OpenStreetMap
  return (await rateLimit('geo:google:day', cap, 86400, { failClosed: true })) === 0;
}

export async function geoSearch(query: string): Promise<PlaceResult[]> {
  const q = query.trim().toLowerCase().slice(0, 100);
  if (q.length < 3) return [];
  const hit = searchCache.get(q);
  if (hit && Date.now() - hit.at < DAY) return hit.v;

  let out: PlaceResult[] | null = null;
  if (await useGoogle()) {
    try {
      // Places Text Search knows streets, schools, junctions and landmarks that the plain Geocoding API misses.
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({ textQuery: q, regionCode: 'NG', maxResultCount: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const j = await res.json();
      out = (j.places ?? [])
        .filter((p: any) => p.location)
        .map((p: any) => {
          const name: string = p.displayName?.text ?? '';
          const addr: string = (p.formattedAddress ?? '').replace(/, Nigeria$/, '');
          return {
            lat: p.location.latitude, lng: p.location.longitude,
            label: name && !addr.toLowerCase().startsWith(name.toLowerCase()) ? `${name}, ${addr}` : addr || name,
          };
        });
    } catch (e: any) {
      console.error('[geo] Google search failed, falling back to OpenStreetMap:', e?.message ?? e);
    }
  }
  if (!out) {
    await osmGate();
    const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=ng&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('Search failed');
    out = ((await res.json()) as any[]).map(d => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name as string }));
  }
  if (searchCache.size > 500) searchCache.clear();
  searchCache.set(q, { at: Date.now(), v: out });
  return out;
}

export async function geoReverse(lat: number, lng: number): Promise<ReverseResult | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;     // ~10 m: nearby pins share one answer
  const hit = reverseCache.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.v;

  let out: ReverseResult | null = null;
  try {
    if (await useGoogle()) {
      try {
        const url = 'https://maps.googleapis.com/maps/api/geocode/json?' + new URLSearchParams({
          latlng: `${lat},${lng}`, key: process.env.GOOGLE_MAPS_API_KEY!,
        });
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (j.status !== 'OK' && j.status !== 'ZERO_RESULTS') throw new Error(`${j.status}: ${j.error_message ?? ''}`);
        const r = j.results?.[0];
        if (r) {
          const get = (...t: string[]) => r.address_components?.find((c: any) => t.some(x => c.types.includes(x)))?.long_name ?? '';
          const street = [get('street_number'), get('route')].filter(Boolean).join(' ');
          const area = get('neighborhood', 'sublocality', 'sublocality_level_1');
          out = {
            address: [street, area].filter(Boolean).join(', ') || r.formatted_address || '',
            city: get('locality', 'administrative_area_level_2'),
            state: get('administrative_area_level_1'),
          };
        }
      } catch (e: any) {
        console.error('[geo] Google reverse failed, falling back to OpenStreetMap:', e?.message ?? e);
      }
    }
    if (!out) {
      await osmGate();
      const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const d = await res.json();
        const a = d.address ?? {};
        const street = [a.house_number, a.road].filter(Boolean).join(' ');
        const area = a.neighbourhood || a.suburb || '';
        out = {
          address: [street, area].filter(Boolean).join(', ') || (d.display_name as string) || '',
          city: a.city || a.town || a.village || a.county || a.state_district || '',
          state: a.state || '',
        };
      }
    }
  } catch { out = null; }
  if (out) {                                  // never remember a failure
    if (reverseCache.size > 1000) reverseCache.clear();
    reverseCache.set(key, { at: Date.now(), v: out });
  }
  return out;
}