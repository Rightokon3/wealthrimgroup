// Helpers for riders: open turn-by-turn navigation to a store's saved coordinates.
// These URLs need no API key and work on phones (they open the Google Maps app if installed).

export function googleMapsDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

// Fallback that does not use Google at all
export function osmDirectionsUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lng}`;
}

// Just show the pin without navigation
export function googleMapsPinUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/* Example on the rider screen:

<a
  href={googleMapsDirectionsUrl(order.stores.latitude, order.stores.longitude)}
  target="_blank" rel="noopener noreferrer"
  className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold"
>
  Navigate to store
</a>

Fetch the coordinates with the order:
  supabase.from('orders').select('*, stores(name, address, phone, latitude, longitude)')
*/