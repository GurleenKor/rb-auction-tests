export const squash = (s: string): string => s.replace(/[\u00a0\s]+/g, ' ').trim();

export const stripAsterisk = (s: string): string => squash(s.replace(/\*/g, ''));

/**
 * Parses a displayed result total such as "2.2k results for ...", "1-60 of 2,290" or "0 results".
 * "of N" (exact) wins over the abbreviated "2.2k" form.
 */
export function parseResultCount(text: string): number | null {
  const of = /\bof\s+([\d,]+)/i.exec(text);
  if (of) return Number(of[1].replace(/,/g, ''));
  const m = /([\d][\d.,]*)\s*([km])?\s+results?\b/i.exec(text);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (Number.isNaN(n)) return null;
  const mult = m[2]?.toLowerCase() === 'k' ? 1_000 : m[2]?.toLowerCase() === 'm' ? 1_000_000 : 1;
  return Math.round(n * mult);
}
