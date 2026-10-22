import { useCallback, useState } from 'react';

const CACHE_KEY = 'tokri_geocode_cache_v1';
const NOMINATIM_DELAY_MS = 1100;
let lastNominatimCall = 0;

export interface LocationResult {
  lat: number;
  lng: number;
  line: string;
  pincode: string | null;
  usedGeocoder: boolean;
}

type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'timeout' | 'error';

interface CachedAddress {
  line: string;
  pincode: string | null;
}

function readCache(): Record<string, CachedAddress> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, CachedAddress>;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CachedAddress>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage failures.
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<CachedAddress | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cache = readCache();
  if (cache[key]) return cache[key];

  const wait = Math.max(0, NOMINATIM_DELAY_MS - (Date.now() - lastNominatimCall));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimCall = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const address = body.address ?? {};
  const parts = [
    address.house_number,
    address.road || address.pedestrian || address.neighbourhood,
    address.suburb || address.city_district,
    address.city || address.town || address.village || address.county,
    address.state,
  ].filter((part): part is string => Boolean(part && part.trim()));
  const line = parts.length >= 2 ? parts.join(', ') : body.display_name ?? `${lat}, ${lng}`;
  const result: CachedAddress = { line, pincode: address.postcode ?? null };
  writeCache({ ...cache, [key]: result });
  return result;
}

/**
 * Geolocation is only requested from a click, never on page load.
 * Reverse geocoding is click-triggered and cached because Nominatim allows
 * roughly one request per second and expects caching.
 */
export function useLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<LocationResult | null> => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setError('This browser cannot share a location. Enter the address manually.');
      return null;
    }
    setStatus('locating');
    setError(null);
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (geoError) => {
          if (geoError.code === 1) {
            setStatus('denied');
            setError('Location permission was denied. Enter the address manually.');
          } else if (geoError.code === 3) {
            setStatus('timeout');
            setError('Location timed out. Enter the address manually.');
          } else {
            setStatus('unavailable');
            setError('Location is unavailable right now. Enter the address manually.');
          }
          resolve(null);
        },
        { timeout: 10000, maximumAge: 60000 },
      );
    });
    if (!position) return null;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    let geocoded: CachedAddress | null = null;
    try {
      geocoded = await reverseGeocode(lat, lng);
    } catch {
      geocoded = null;
    }
    setStatus('ready');
    return {
      lat,
      lng,
      line: geocoded?.line ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      pincode: geocoded?.pincode ?? null,
      usedGeocoder: Boolean(geocoded),
    };
  }, []);

  return { locate, status, error };
}
