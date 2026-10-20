'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

export type PickedPlace = {
  city: string; state: string | null; address: string; label: string; lat: number | null; lng: number | null;
};

/**
 * Search any place: a city, an area or a street ("Uyo", "Abak Road Uyo", "Mushin").
 * Live results come from the map service (OpenStreetMap now, Google later).
 * onChange('') while typing; onChange(city, place) once a result is picked, so a
 * half-typed value can never be saved. If the map service is down, the typed text
 * can be used as the city.
 */
export default function CityPicker({
  value, onChange, className, placeholder = 'Search your location, e.g. Uyo or Abak Road',
}: {
  value: string;
  onChange: (city: string, place?: PickedPlace) => void;
  className?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<PickedPlace[]>([]);
  const [down, setDown] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const lastCity = useRef('');

  // when the parent sets a different value (map pin, loaded profile), show it
  useEffect(() => {
    if (value && value !== lastCity.current && value !== text) setText(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function type(v: string) {
    setText(v); setOpen(true); lastCity.current = ''; onChange('');
    const id = ++seq.current;
    if (v.trim().length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    setTimeout(async () => {
      if (id !== seq.current) return;                 // a newer keystroke took over
      try {
        const r = await fetch(`/api/places/cities?q=${encodeURIComponent(v.trim())}`, { signal: AbortSignal.timeout(12000) });
        const j = await r.json();
        if (id !== seq.current) return;
        setHits(j.results ?? []); setDown(!!j.unavailable || !r.ok);
      } catch { if (id === seq.current) { setHits([]); setDown(true); } }
      finally { if (id === seq.current) setLoading(false); }
    }, 500);
  }

  function pick(city: string, place?: PickedPlace) {
    lastCity.current = city;
    setText(place?.label ?? city);
    onChange(city, place);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <input value={text} onChange={e => type(e.target.value)} onFocus={() => text.length >= 2 && setOpen(true)}
        placeholder={placeholder} autoComplete="off" className={className} />
      {open && text.trim().length >= 2 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {loading && <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Searching…</div>}
          {!loading && hits.map(h => (
            <button type="button" key={h.label} onClick={() => pick(h.city, h)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-800 font-semibold">{h.label}</span>
            </button>
          ))}
          {!loading && hits.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-500">
              {down ? 'Location search is unavailable right now.' : 'No match found.'}{' '}
              <button type="button" onClick={() => pick(text.trim())} className="font-bold text-orange-600 hover:underline">
                Use “{text.trim()}”
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
