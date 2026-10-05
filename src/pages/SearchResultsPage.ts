import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { env } from '../config/env';
import { parseResultCount, squash } from '../utils/parse';

export interface LotSummary { title: string; location: string | null; date: string | null }

/** https://www.rbauction.com/search?freeText=<text> */
export class SearchResultsPage extends BasePage {
  readonly totalHeader: Locator; // "2.2k results for "Edmonton""
  readonly paginationTotal: Locator; // "1-60 of 2290"
  readonly lotCards: Locator;

  constructor(page: Page) {
    super(page);
    this.totalHeader = page.getByText(/[\d.,]+\s*[km]?\s+results?\s+for/i).first();
    this.paginationTotal = page.getByText(/\d+\s*[-–]\s*\d+\s+of\s+[\d,]+/i).first();
    this.lotCards = page.locator(env.lotCardSelector);
  }

  async open(freeText: string) {
    return this.goto(`/search?freeText=${encodeURIComponent(freeText)}`);
  }

  /** Parsed total as displayed on the page. Prefers the exact "of N" figure over the "2.2k" label. */
  async displayedTotal(): Promise<number | null> {
    const candidates: Locator[] = [this.paginationTotal, this.totalHeader];
    for (const c of candidates) {
      if (await c.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false)) {
        const n = parseResultCount(squash(await c.innerText()));
        if (n !== null) return n;
      }
    }
    return null;
  }

  /** First-page lots. Location/date are optional on cards and returned as null when absent. */
  async firstPageLots(limit = 60): Promise<LotSummary[]> {
    const n = Math.min(await this.lotCards.count(), limit);
    const lots: LotSummary[] = [];
    for (let i = 0; i < n; i++) {
      const card = this.lotCards.nth(i);
      const text = async (sel: string) => {
        const el = card.locator(sel).first();
        return (await el.count()) ? squash(await el.innerText()) : null;
      };
      lots.push({
        title: (await text(env.lotTitleSelector)) ?? '',
        location: await text('[class*="location" i], [data-testid*="location" i]'),
        date: await text('time, [class*="date" i], [data-testid*="date" i]'),
      });
    }
    return lots;
  }
}