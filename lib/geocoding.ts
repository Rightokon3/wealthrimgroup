// Map search + pin-drop address. These now call OUR server (/api/geo/*), which holds the
// provider key, remembers answers and enforces limits. The map itself is unchanged.
// To move to Google Maps: set PLACES_PROVIDER=google on the server - nothing here changes.

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

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? 'Search failed. Please try again.');
  return j.results ?? [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult | null> {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return (await res.json()).result ?? null;
  } catch {
    return null;
  }
}