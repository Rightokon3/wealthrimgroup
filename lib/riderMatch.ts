// Server/client-safe helpers for deciding which riders are "near" a place.
// Mirrors the SQL function find_nearby_riders so checkout and notifications agree.

export interface GeoPoint {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// "Benin City", "benin" and "Benin, Edo State" all become comparable
export function normCity(s?: string | null): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\b(city|state|lga|metropolis)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** True when the rider is within `radiusKm` of the place, or both are in the same city. */
export function isNearby(rider: GeoPoint, place: GeoPoint, radiusKm = 25): boolean {
  const d = distanceKm(rider, place);
  if (d != null && d <= radiusKm) return true;
  const rc = normCity(rider.city);
  return rc !== '' && rc === normCity(place.city);
}