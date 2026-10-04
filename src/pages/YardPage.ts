import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { DATE_RANGE, ITEM_COUNT, PHONE, WEEKDAY_RANGE } from '../utils/patterns';
import { squash } from '../utils/parse';

export interface AuctionEventCard { dateRange: string; title: string; raw: string }
export interface YardCategory { name: string; quantity: number }
export interface RepresentativeCard { lines: string[]; territory: string | undefined; hasPhone: boolean; hasEmail: boolean }

/** https://www.rbauction.com/lp/<slug> */
export class YardPage extends BasePage {
  readonly heading: Locator;
  readonly detailsHeading: Locator;
  readonly auctionEventsHeading: Locator;
  readonly aboutHeading: Locator;
  readonly itemsInYardHeading: Locator;
  readonly sellerHeading: Locator;
  readonly representativesTab: Locator;

  constructor(page: Page) {
    super(page);
    // The yard name is an <h3> on the live site (not h1), so take the first h1-h3 in document order.
    this.heading = page.locator('h1, h2, h3').first();
    this.detailsHeading = this.headingByName(/^details$/i);
    this.auctionEventsHeading = this.headingByName(/auction events/i);
    this.aboutHeading = this.headingByName(/about this yard/i);
    this.itemsInYardHeading = this.headingByName(/items in yard/i);
    this.sellerHeading = this.headingByName(/become a seller/i);
    this.representativesTab = page
      .getByRole('tab', { name: /^\s*representatives\s*$/i })
      .or(page.getByRole('button', { name: /^\s*representatives\s*$/i }))
      .or(page.getByText(/^\s*representatives\s*$/i))
      .first();
  }

  async open(slug: string) {
    return this.goto(`/lp/${slug}`);
  }

  // ---- 3.1 Details -------------------------------------------------------------------------
  /** Text of the smallest block that contains both the street line and the postal code. */
  addressBlock(street: string, postalPrefix: string): Locator {
    return this.page
      .getByText(new RegExp(street, 'i'))
      .first()
      .locator(`xpath=ancestor-or-self::*[contains(., "${postalPrefix}")][1]`);
  }

  async officeHoursText(): Promise<string> {
    const el = this.page.getByText(WEEKDAY_RANGE).first();
    const own = squash(await el.innerText());
    const around = squash(await this.textAround(el));
    return `${own} ${around}`;
  }

  phoneLink(): Locator {
    return this.page.locator('a[href^="tel:"]').first();
  }

  async phoneText(): Promise<string | null> {
    const link = this.phoneLink();
    if ((await link.count()) > 0) return squash(await link.innerText());
    const body = await this.page.locator('body').innerText();
    return PHONE.exec(body)?.[0] ?? null;
  }

  // ---- 3.2 Auction events ------------------------------------------------------------------
  private eventCardLocator(): Locator {
    return this.auctionEventsHeading
      .locator('xpath=following::a')
      .filter({ hasText: DATE_RANGE });
  }

  async auctionEvents(): Promise<AuctionEventCard[]> {
    const texts = await this.eventCardLocator().allInnerTexts();
    return texts.map((t) => {
      const raw = squash(t);
      const dateRange = DATE_RANGE.exec(raw)?.[0] ?? '';
      const title = squash(raw.replace(DATE_RANGE, ''));
      return { dateRange, title, raw };
    });
  }

  // ---- 3.3 About ---------------------------------------------------------------------------
  /** Nearest ancestor of the heading that holds a meaningful amount of text (the section body). */
  async aboutText(): Promise<string> {
    const block = this.aboutHeading.locator('xpath=ancestor::*[string-length(normalize-space(.)) > 120][1]');
    const text = squash(await block.innerText());
    return squash(text.replace(/about this yard/i, ''));
  }

  // ---- 3.4 Items in yard carousel ----------------------------------------------------------
  /**
   * Counts every category card in the carousel, *including off-screen slides*: we read the DOM
   * (not visibility), keyed on the "N items" label that only carousel cards carry. Carousel
   * libraries may clone slides for looping, so cards are de-duplicated by name.
   */
  async yardCategories(): Promise<YardCategory[]> {
    await this.itemsInYardHeading.scrollIntoViewIfNeeded().catch(() => undefined);
    // Category cards are anchors to /cp/<slug>?freeText=<city>. The freeText param excludes the
    // footer's "Top categories" links; "following::" from the heading excludes everything above it.
    const cards = this.itemsInYardHeading.locator(
      'xpath=following::a[contains(@href,"/cp/") and contains(@href,"freeText=")]',
    );
    const raw = await cards.evaluateAll((els) =>
      els.map((el) => {
        const clean = (s: string) => s.replace(/[\u00a0\s]+/g, ' ').trim();
        const h = el as HTMLElement;
        return {
          lines: (h.innerText ?? '').split('\n').map(clean).filter(Boolean),
          all: clean(h.textContent ?? ''),
        };
      }),
    );
    const byName = new Map<string, YardCategory>();
    for (const r of raw) {
      const qty = ITEM_COUNT.exec(r.all);
      if (!qty) continue;
      let name = r.lines.find((l) => !ITEM_COUNT.test(l)) ?? '';
      if (!name) {
        // textContent fallback: "Harvesting Equipment Harvesting Equipment78 items" -> de-duplicate the doubled name
        const t = squash(r.all.replace(ITEM_COUNT, ''));
        name = /^(.+?)\s*\1$/.exec(t)?.[1] ?? t;
      }
      if (!name || byName.has(name)) continue;
      byName.set(name, { name, quantity: Number(qty[1].replace(/,/g, '')) });
    }
    return [...byName.values()];
  }

  // ---- 3.5 Selling CTA (read-only: there is deliberately NO submit method) ------------------
  /** The form that follows the "Become a seller" heading (or encloses it). Never submitted. */
  sellerForm(): Locator {
    return this.sellerHeading.locator('xpath=ancestor::form | following::form[1]').first();
  }

  /** Nearest block holding both the heading and the form (contains the "+1-866-…" number and the phone field). */
  sellerSection(): Locator {
    return this.sellerHeading.locator('xpath=ancestor::*[.//form][1]');
  }

  async sellerFormHasPhone(): Promise<boolean> {
    const section = this.sellerSection();
    const evidence = section.locator(
      'a[href^="tel:"], input[type="tel"], input[name*="phone" i], input[id*="phone" i], input[aria-label*="phone" i]',
    );
    if ((await evidence.count()) > 0) return true;
    return PHONE.test(await section.innerText());
  }

  // ---- 3.6 Representatives -----------------------------------------------------------------
  async openRepresentativesTab(): Promise<void> {
    await this.representativesTab.scrollIntoViewIfNeeded();
    await this.representativesTab.click();
  }

  /**
   * A rep card = the smallest ancestor of a contact link that contains exactly one h3/h4 (the rep's name)
   * which is not a page-section heading. Card layout: name, territory, role, department, Mobile/Phone/Email.
   */
  async representatives(): Promise<RepresentativeCard[]> {
    const raw = await this.page.locator('a[href^="mailto:"], a[href^="tel:"]').evaluateAll((links) => {
      const clean = (s: string) => s.replace(/[\u00a0\s]+/g, ' ').trim();
      const section = /^(details|auction events|about this yard|items in yard|additional information|become a seller)$/i;
      const cards = new Map<string, string[]>();
      for (const link of links) {
        let node: Element | null = link.parentElement;
        for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
          const heads = Array.from(node.querySelectorAll('h3, h4'));
          if (heads.length === 0) continue;
          if (heads.length === 1 && !section.test(clean(heads[0].textContent ?? ''))) {
            const lines = ((node as HTMLElement).innerText ?? '').split('\n').map(clean).filter(Boolean);
            cards.set(lines.join('|'), lines);
          }
          break;
        }
      }
      return [...cards.values()];
    });
    return raw.map((lines) => {
      const joined = lines.join(' ');
      return {
        lines,
        territory: lines[1], // line after the rep's name
        hasPhone: PHONE.test(joined),
        hasEmail: /@/.test(joined),
      };
    });
  }
}
