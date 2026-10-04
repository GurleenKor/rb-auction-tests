/** Console output required by the spec (totals / first titles). Kept in one place. */
export const log = (label: string, value: unknown): void =>
  console.log(`[info] ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
