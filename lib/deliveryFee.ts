// lib/deliveryFee.ts
// ================================================================
// Distance-based delivery fee calculation
// Rate: ₦1,000 per kilometer between vendor and customer
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

// ── Rate configuration ───────────────────────────────────────────
const RATE_PER_KM = 1_0; // ₦1,000 per km
const MIN_FEE     = 500;   // floor — very short deliveries still cost something
const MAX_FEE: number | null = null; // set e.g. 5000 to cap long-distance fees; null = uncapped
const ROUND_TO    = 50;    // round the computed fee to the nearest ₦50

export interface FeeResult {
  fee:         number;
  distanceKm:  number | null;
  label:       string;   // human-readable explanation
  tier:        string;   // short badge for UI
}

// Distance bands used only for the UI badge/colour — the fee itself
// always comes from km × ₦1,000, these are just labels.
const TIER_LABELS: { maxKm: number; tier: string }[] = [
  { maxKm:  2,       tier: 'Nearby'       },
  { maxKm:  5,       tier: 'Short ride'   },
  { maxKm: 10,       tier: 'Medium'       },
  { maxKm: 20,       tier: 'Far'          },
  { maxKm: 40,       tier: 'Cross-city'   },
  { maxKm: Infinity, tier: 'Long distance'},
];

function tierForKm(km: number): string {
  return TIER_LABELS.find(t => km <= t.maxKm)!.tier;
}

function roundFee(rawFee: number): number {
  let fee = Math.max(MIN_FEE, Math.round(rawFee / ROUND_TO) * ROUND_TO);
  if (MAX_FEE !== null) fee = Math.min(fee, MAX_FEE);
  return fee;
}

// ── Primary: coord-based (₦1,000/km) ─────────────────────────────
export function feeFromCoords(
  customerCoords: Coords,
  vendorCoords:   Coords,
): FeeResult {
  const km  = haversineKm(customerCoords, vendorCoords);
  const fee = roundFee(km * RATE_PER_KM);
  const distanceKm = Math.round(km * 10) / 10;
  return {
    fee,
    distanceKm,
    label: `${distanceKm} km · ₦${fee.toLocaleString()}`,
    tier:  tierForKm(km),
  };
}

// ── Fallback: city-name matching ─────────────────────────────────
// Used only when exact coordinates aren't available for the vendor
// and/or the customer. These are rough estimates, not measured
// distances — encourage vendors to capture their GPS location and
// customers to share theirs for an accurate fee.

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

// Assumed distances used ONLY when we can't compute a real one —
// deliberately conservative (cheaper) so we don't overcharge on a guess.
const ASSUMED_SAME_CITY_KM      = 3;
const ASSUMED_DIFFERENT_CITY_KM = 15;

function normalise(city: string) { return city.toLowerCase().trim(); }

export function feeFromCities(
  customerCity: string,
  vendorCity:   string,
): FeeResult {
  const cc = normalise(customerCity);
  const vc = normalise(vendorCity);

  // If we know both cities' coords, use haversine between city centers
  const cCoords = CITY_COORDS[cc];
  const vCoords = CITY_COORDS[vc];
  if (cCoords && vCoords) {
    return feeFromCoords(cCoords, vCoords);
  }

  // Same city name, no coords — assume a short in-city hop
  if (cc === vc) {
    const fee = roundFee(ASSUMED_SAME_CITY_KM * RATE_PER_KM);
    return { fee, distanceKm: null, label: `Same city (estimated) · ₦${fee.toLocaleString()}`, tier: 'Medium' };
  }

  // Different city, unknown coords — assume a longer trip
  const fee = roundFee(ASSUMED_DIFFERENT_CITY_KM * RATE_PER_KM);
  return { fee, distanceKm: null, label: `Different city (estimated) · ₦${fee.toLocaleString()}`, tier: 'Long distance' };
}

// ── Master function ───────────────────────────────────────────────
// Priority: vendor's flat override → real coords → city-name fallback
export function calculateDeliveryFee(
  customerCity:       string,
  vendorCity:         string,
  customerCoords?:    Coords | null,
  vendorCoords?:      Coords | null,
  customDeliveryFee?: number | null,
): FeeResult {
  if (customDeliveryFee != null && customDeliveryFee > 0) {
    return {
      fee:        customDeliveryFee,
      distanceKm: null,
      label:      `Vendor flat rate · ₦${customDeliveryFee.toLocaleString()}`,
      tier:       'Flat rate',
    };
  }
  if (customerCoords && vendorCoords) {
    return feeFromCoords(customerCoords, vendorCoords);
  }
  return feeFromCities(customerCity, vendorCity);
}