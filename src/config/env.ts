import 'dotenv/config';

/** Single place where environment configuration is read. */
export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://www.rbauction.com',
  ci: !!process.env.CI,
  // Live production site: keep concurrency low by default.
  workers: Number(process.env.WORKERS ?? 2),
  searchPayloadTemplate: process.env.SEARCH_PAYLOAD_TEMPLATE,
  lotCardSelector:
    process.env.LOT_CARD_SELECTOR ??
    '[data-testid*="lot" i], [data-testid*="asset" i], [class*="lot-card" i], [class*="LotCard"], [class*="asset-card" i], [class*="AssetCard"], article',
  lotTitleSelector:
    process.env.LOT_TITLE_SELECTOR ??
    '[data-testid*="title" i], [class*="title" i], h2, h3, h4',
};
