// lib/deliveryFee.ts
// ================================================================
// Distance-based delivery fee calculation
// Base: ₦3,000 — reduces the closer the customer is to the vendor
// ================================================================

export interface Coords {
  lat: number;
  lng: number;
}

// ── Haversine formula — straight-line distance in km ────────────
export function haversineKm(a: Coords, b: Coords): number {
  const R    = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// ── Fee tiers by distance ────────────────────────────────────────
// Starts at ₦3,000 (base/max), steps down the closer you are
//
//  0 –  2 km  →  ₦500    (same neighbourhood)
//  2 –  5 km  →  ₦1,000  (short ride)
//  5 – 10 km  →  ₦1,500  (medium)
// 10 – 20 km  →  ₦2,000  (far within city)
// 20 – 40 km  →  ₦2,500  (cross-city fringe)
// 40+ km      →  ₦3,000  (base / different city)

export interface FeeResult {
  fee:         number;
  distanceKm:  number | null;
  label:       string;   // human-readable explanation
  tier:        string;   // short badge for UI
}

const TIERS: { maxKm: number; fee: number; tier: string; label: string }[] = [
  { maxKm:  2, fee:   500, tier: 'Nearby',      label: 'Within 2 km'      },
  { maxKm:  5, fee: 1_000, tier: 'Short ride',  label: '2 – 5 km'         },
  { maxKm: 10, fee: 1_500, tier: 'Medium',      label: '5 – 10 km'        },
  { maxKm: 20, fee: 2_000, tier: 'Far',         label: '10 – 20 km'       },
  { maxKm: 40, fee: 2_500, tier: 'Cross-city',  label: '20 – 40 km'       },
  { maxKm: Infinity, fee: 3_000, tier: 'Long distance', label: '40+ km'   },
];

// ── Primary: coord-based ─────────────────────────────────────────
export function feeFromCoords(
  customerCoords: Coords,
  vendorCoords:   Coords,
): FeeResult {
  const km = haversineKm(customerCoords, vendorCoords);
  const tier = TIERS.find(t => km <= t.maxKm)!;
  return {
    fee:        tier.fee,
    distanceKm: Math.round(km * 10) / 10,
    label:      `${tier.label} · ₦${tier.fee.toLocaleString()}`,
    tier:       tier.tier,
  };
}

// ── Fallback: city-name matching ─────────────────────────────────
// Used when coords aren't available.
// Same city → ₦1,500 (conservative mid-range)
// Different city → ₦3,000 (base)

const CITY_COORDS: Record<string, Coords> = {
  'lagos':           { lat:  6.5244, lng:  3.3792 },
  'abuja':           { lat:  9.0765, lng:  7.3986 },
  'port harcourt':   { lat:  4.8156, lng:  7.0498 },
  'ibadan':          { lat:  7.3775, lng:  3.9470 },
  'kano':            { lat: 12.0022, lng:  8.5920 },
  'kaduna':          { lat: 10.5105, lng:  7.4165 },
  'benin city':      { lat:  6.3350, lng:  5.6037 },
  'enugu':           { lat:  6.4584, lng:  7.5464 },
  'jos':             { lat:  9.8965, lng:  8.8583 },
  'ilorin':          { lat:  8.5000, lng:  4.5500 },
  'owerri':          { lat:  5.4836, lng:  7.0350 },
  'calabar':         { lat:  4.9517, lng:  8.3220 },
  'warri':           { lat:  5.5167, lng:  5.7500 },
  'accra':           { lat:  5.6037, lng: -0.1870 },
  'nairobi':         { lat: -1.2921, lng: 36.8219 },
};

function normalise(city: string) { return city.toLowerCase().trim(); }

export function feeFromCities(
  customerCity: string,
  vendorCity:   string,
): FeeResult {
  const cc = normalise(customerCity);
  const vc = normalise(vendorCity);

  // If we know both cities' coords, use haversine
  const cCoords = CITY_COORDS[cc];
  const vCoords = CITY_COORDS[vc];

  if (cCoords && vCoords) {
    return feeFromCoords(cCoords, vCoords);
  }

  // Same city name — treat as mid-range
  if (cc === vc) {
    return { fee: 1_500, distanceKm: null, label: 'Same city · ₦1,500', tier: 'Medium' };
  }

  // Different city, unknown coords — base rate
  return { fee: 3_000, distanceKm: null, label: 'Different city · ₦3,000', tier: 'Long distance' };
}

// ── Master function — uses coords if available, falls back to cities ──
export function calculateDeliveryFee(
  customerCity:   string,
  vendorCity:     string,
  customerCoords?: Coords | null,
  vendorCoords?:   Coords | null,
): FeeResult {
  if (customerCoords && vendorCoords) {
    return feeFromCoords(customerCoords, vendorCoords);
  }
  return feeFromCities(customerCity, vendorCity);
}
