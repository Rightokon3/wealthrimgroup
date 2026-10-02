// Geocoding provider: OpenStreetMap Nominatim (free, no API key).
// When you move to Google Maps, only the bodies of these two functions change.
//
// Nominatim usage policy: max ~1 request/second, no "search as you type".
// Fine for development and light use. Switch to Google before heavy production traffic.

export interface PlaceResult {
  lat: number;
  lng: number;
  label: string;
}

export interface ReverseResult {
  address: string;
  city: string;
  state: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=ng&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Search failed. Please try again.');
  const data = await res.json();
  return (data as any[]).map(d => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    label: d.display_name as string,
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult | null> {
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const area = a.neighbourhood || a.suburb || '';
    const address = [street, area].filter(Boolean).join(', ') || (d.display_name as string) || '';
    const city = a.city || a.town || a.village || a.county || a.state_district || '';
    const state = a.state || '';
    return { address, city, state };
  } catch {
    return null;
  }
}