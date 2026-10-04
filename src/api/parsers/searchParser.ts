import { findArrays, findByKey, isObject, type Obj } from './deepSearch';

export interface SearchSummary {
  total: number | null;
  records: Obj[];
  titles: string[];
}

const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/,/g, '')) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** ADAPTER for POST /api/search: total in results.totalAmount, display name in assetDescription. */
export function parseSearch(body: unknown): SearchSummary {
  let total: number | null = null;
  if (isObject(body) && isObject(body.results)) total = toNumber(body.results.totalAmount);
  if (total === null) total = toNumber(findByKey(body, 'totalAmount')[0]?.value);

  const arrays = findArrays(body, (a) => a.length > 0 && a.every(isObject) && a.some((r) => 'assetDescription' in (r as Obj)));
  const records = (arrays.sort((a, b) => b.length - a.length)[0] ?? []) as Obj[];
  const titles = records.map((r) => (typeof r.assetDescription === 'string' ? r.assetDescription.trim() : ''));
  return { total, records, titles };
}
