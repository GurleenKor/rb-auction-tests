export type Obj = Record<string, unknown>;

export const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Depth-first visit of every node in a JSON tree. */
export function walk(root: unknown, visit: (value: unknown, key: string | null, parent: unknown) => void, maxDepth = 40): void {
  const go = (value: unknown, key: string | null, parent: unknown, depth: number) => {
    visit(value, key, parent);
    if (depth >= maxDepth) return;
    if (Array.isArray(value)) value.forEach((v) => go(v, null, value, depth + 1));
    else if (isObject(value)) Object.entries(value).forEach(([k, v]) => go(v, k, value, depth + 1));
  };
  go(root, null, null, 0);
}

export function findArrays(root: unknown, predicate: (arr: unknown[], key: string | null) => boolean): unknown[][] {
  const out: unknown[][] = [];
  walk(root, (v, k) => {
    if (Array.isArray(v) && predicate(v, k)) out.push(v);
  });
  return out;
}

export function findByKey(root: unknown, key: string | RegExp): { key: string; value: unknown }[] {
  const out: { key: string; value: unknown }[] = [];
  walk(root, (v, k) => {
    if (k !== null && (typeof key === 'string' ? k === key : key.test(k))) out.push({ key: k, value: v });
  });
  return out;
}

export function collectStrings(root: unknown): string[] {
  const out: string[] = [];
  walk(root, (v) => {
    if (typeof v === 'string') out.push(v.replace(/[\u00a0\s]+/g, ' ').trim());
  });
  return out;
}

/** First non-empty string-like value among `keys`; unwraps {name|label|code|value} objects. */
export function pickString(obj: Obj, keys: readonly string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
    if (isObject(v)) {
      const inner = pickString(v, ['name', 'label', 'code', 'value', 'en']);
      if (inner) return inner;
    }
  }
  return undefined;
}
