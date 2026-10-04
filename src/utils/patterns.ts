const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?';

/** "Sep 22 - Sep 25", "Sep 22 - 25", "Sep 22, 2026 - Sep 25, 2026" */
export const DATE_RANGE = new RegExp(
  `\\b${MONTH}\\s+\\d{1,2}(?:,?\\s*\\d{4})?\\s*[-–—]\\s*(?:${MONTH}\\s+)?\\d{1,2}(?:,?\\s*\\d{4})?`,
  'i',
);
export const WEEKDAY_RANGE = /Mon(?:day)?\s*[-–—]\s*Fri(?:day)?/i;
export const TIME_RANGE =
  /\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)/i;
export const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
export const ITEM_COUNT = /(\d[\d,]*)\s+items?\b/i;
