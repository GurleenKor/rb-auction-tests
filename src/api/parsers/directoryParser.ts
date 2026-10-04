import { canonicalCountry } from '../../data/countries';
import { findArrays, isObject, pickString, type Obj } from './deepSearch';

/**
 * ADAPTER: the only place that knows how /lp payload fields are named.
 * If the site renames a field, change these key lists — specs stay untouched.
 */
const NAME_KEYS = ['name', 'locationName', 'yardName', 'siteName', 'displayName', 'title', 'city'] as const;
const COUNTRY_KEYS = ['country', 'countryName', 'countryCode', 'countryIso', 'countryCodeIso3'] as const;
const COUNTRY_CODE_KEYS = ['countryCode', 'countryIso', 'countryCodeIso3', 'country'] as const;
const TYPE_KEYS = ['siteType', 'locationType', 'yardType', 'type', 'kind'] as const;
const SATELLITE_FLAGS = ['isSatellite', 'satellite'] as const;

export type SiteType = 'Satellite' | 'Permanent' | 'Unknown';

export interface ApiLocation {
  name: string;
  country: string; // canonical
  countryRaw: string;
  siteType: SiteType;
}

function siteTypeOf(raw: Obj, name: string): SiteType {
  for (const f of SATELLITE_FLAGS) if (typeof raw[f] === 'boolean') return raw[f] ? 'Satellite' : 'Permanent';
  const t = pickString(raw, TYPE_KEYS);
  if (t && /satellite/i.test(t)) return 'Satellite';
  if (t && /permanent/i.test(t)) return 'Permanent';
  if (name.trim().endsWith('*')) return 'Satellite';
  return 'Unknown';
}

export function normalizeLocation(raw: unknown, inheritedCountry?: string): ApiLocation | null {
  if (!isObject(raw)) return null;
  const name = pickString(raw, NAME_KEYS);
  const countryRaw = pickString(raw, COUNTRY_KEYS) ?? pickString(raw, COUNTRY_CODE_KEYS) ?? inheritedCountry;
  if (!name || !countryRaw) return null;
  return {
    name: name.replace(/\*/g, '').trim(),
    countryRaw,
    country: canonicalCountry(countryRaw),
    siteType: siteTypeOf(raw, name),
  };
}

/** Finds the largest array in the payload that looks like a list of yards/locations. */
export function extractLocations(root: unknown): ApiLocation[] {
  let best: ApiLocation[] = [];
  for (const arr of findArrays(root, (a) => a.length >= 10 && a.every(isObject))) {
    const ok = arr.map((e) => normalizeLocation(e)).filter((x): x is ApiLocation => !!x);
    if (ok.length >= arr.length * 0.8 && ok.length > best.length) best = ok;
  }
  if (best.length) return best;

  // Fallback: groups like [{ country: 'Canada', yards: [{ name }, ...] }, ...]
  const grouped: ApiLocation[] = [];
  for (const arr of findArrays(root, (a) => a.length >= 2 && a.every(isObject))) {
    for (const g of arr as Obj[]) {
      const country = pickString(g, COUNTRY_KEYS) ?? pickString(g, ['name', 'label']);
      if (!country) continue;
      for (const child of Object.values(g)) {
        if (Array.isArray(child) && child.length && child.every(isObject)) {
          child.forEach((c) => {
            const loc = normalizeLocation(c, country);
            if (loc) grouped.push(loc);
          });
        }
      }
    }
  }
  return grouped;
}
