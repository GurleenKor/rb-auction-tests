import { collectStrings, findByKey, isObject, pickString, walk, type Obj } from './deepSearch';

/** ADAPTER: field names for the /lp/<slug> payload (spec names itemsInYard/categoryLocalized/totalAssets). */
const EVENT_NAME_KEYS = ['name', 'title', 'eventName', 'displayName', 'description'] as const;
const EVENT_START_KEYS = ['startDate', 'start', 'beginDate', 'startDateTime', 'dateStart', 'eventDate', 'date'] as const;
const EVENT_END_KEYS = ['endDate', 'end', 'finishDate', 'endDateTime', 'dateEnd'] as const;
const EVENT_RANGE_KEYS = ['dateRange', 'dates', 'displayDate'] as const;

export interface ApiEvent { name: string | undefined; start: string | undefined; end: string | undefined; range: string | undefined; json: string }
export interface ApiCategory { name: string; totalAssets: unknown }

export interface YardData {
  /** Smallest object that looks like the yard itself (name Edmonton + street). Falls back to whole payload. */
  yardName: string | undefined;
  scopeText: string;
  hasHours: boolean;
  events: ApiEvent[];
  categories: ApiCategory[];
}

function findYardObject(root: unknown, namePattern: RegExp, marker: RegExp): Obj | null {
  let best: { obj: Obj; size: number } | null = null;
  walk(root, (v) => {
    if (!isObject(v)) return;
    const n = pickString(v, ['name', 'locationName', 'yardName', 'title', 'displayName']);
    if (!n || !namePattern.test(n)) return;
    const json = JSON.stringify(v);
    if (!marker.test(json)) return;
    if (!best || json.length < best.size) best = { obj: v, size: json.length };
  });
  return (best as { obj: Obj } | null)?.obj ?? null;
}

export function parseYard(root: unknown, namePattern = /^edmonton/i, marker = /sparrow/i): YardData {
  const yard = findYardObject(root, namePattern, marker);
  const scope = yard ?? root;
  const scopeText = collectStrings(scope).join(' | ');

  let hasHoursKey = false;
  walk(scope, (_v, k) => {
    if (k && /hours/i.test(k)) hasHoursKey = true;
  });

  const events: ApiEvent[] = [];
  for (const { value } of findByKey(root, /events?$/i)) {
    if (!Array.isArray(value)) continue;
    for (const e of value) {
      if (!isObject(e)) continue;
      events.push({
        name: pickString(e, EVENT_NAME_KEYS),
        start: pickString(e, EVENT_START_KEYS),
        end: pickString(e, EVENT_END_KEYS),
        range: pickString(e, EVENT_RANGE_KEYS),
        json: JSON.stringify(e),
      });
    }
  }

  // itemsInYard: flatten nested lists by collecting every node that carries categoryLocalized.
  const categories = new Map<string, ApiCategory>();
  for (const { value } of findByKey(root, 'itemsInYard')) {
    walk(value, (v) => {
      if (isObject(v) && typeof v.categoryLocalized === 'string') {
        if (!categories.has(v.categoryLocalized)) {
          categories.set(v.categoryLocalized, { name: v.categoryLocalized, totalAssets: v.totalAssets });
        }
      }
    });
  }

  return {
    yardName: yard ? pickString(yard, ['name', 'locationName', 'yardName', 'title', 'displayName']) : undefined,
    scopeText,
    hasHours: hasHoursKey,
    events,
    categories: [...categories.values()],
  };
}
