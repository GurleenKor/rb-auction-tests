import { squash } from '../utils/parse';

/** Canonical country name -> accepted aliases (ISO codes, long names). */
const ALIASES: Record<string, string[]> = {
  'United States': ['US', 'USA', 'U.S.', 'United States of America'],
  Canada: ['CA', 'CAN'],
  Australia: ['AU', 'AUS'],
  'United Kingdom': ['UK', 'GB', 'GBR', 'Great Britain'],
  Netherlands: ['NL', 'NLD', 'The Netherlands'],
  UAE: ['AE', 'ARE', 'United Arab Emirates'],
};

/** Maps any known alias to its canonical name; unknown values are returned trimmed. */
export function canonicalCountry(value: string): string {
  const t = squash(value).toLowerCase();
  for (const [canon, aliases] of Object.entries(ALIASES)) {
    if (t === canon.toLowerCase() || aliases.some((a) => a.toLowerCase() === t)) return canon;
  }
  return squash(value);
}
