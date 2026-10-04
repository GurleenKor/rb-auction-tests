import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { canonicalCountry } from '../data/countries';
import { EXPECTED } from '../data/expectations';

export interface DirectorySite {
  country: string;
  name: string; // without asterisk
  isSatellite: boolean;
  href: string | null;
}

/** https://www.rbauction.com/lp */
export class LocationsDirectoryPage extends BasePage {
  readonly heading: Locator;
  readonly introText: Locator;
  readonly satelliteNote: Locator;
  readonly auctionSitesToggle: Locator;
  readonly representativesToggle: Locator;
  readonly representativesSearchPrompt: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.headingByName(/^locations$/i);
    this.introText = page.getByText(EXPECTED.directory.introPattern).first();
    this.satelliteNote = page.getByText(EXPECTED.directory.satelliteNotePattern).first();
    this.auctionSitesToggle = this.toggle(/^\s*auction sites\s*$/i);
    this.representativesToggle = this.toggle(/^\s*local representatives\s*$/i);
    this.representativesSearchPrompt = page.getByText(/search for representatives/i).first();
  }

  private toggle(name: RegExp): Locator {
    return this.page
      .getByRole('tab', { name })
      .or(this.page.getByRole('button', { name }))
      .or(this.page.getByRole('radio', { name }))
      .or(this.page.getByText(name))
      .first();
  }

  async open(): Promise<void> {
    await this.goto('/lp');
  }

  /**
   * Reads the whole directory from the DOM in one pass: every h4 country heading (outside
   * header/nav/footer) followed by the /lp/<slug> links that belong to it.
   * Satellite = an asterisk on the link, right after it, or in its <li>.
   */
  async readDirectory(): Promise<DirectorySite[]> {
    const firstH4 = this.page.locator('h4').first();
    await firstH4.waitFor({ state: 'attached' });
    await firstH4.scrollIntoViewIfNeeded(); // "scroll below the map"

    const raw = await this.page.evaluate(() => {
      const out: { country: string; text: string; href: string | null; star: boolean }[] = [];
      const isSite = (a: Element) => /\/lp\/[^/?#]+/.test(a.getAttribute('href') ?? '');
      const collect = (start: Element): HTMLAnchorElement[] => {
        const found: HTMLAnchorElement[] = [];
        let n = start.nextElementSibling;
        while (n && !(n.matches('h4') || n.querySelector('h4'))) {
          if (n instanceof HTMLAnchorElement) found.push(n);
          n.querySelectorAll('a').forEach((a) => found.push(a));
          n = n.nextElementSibling;
        }
        return found.filter(isSite);
      };
      const h4s = Array.from(document.querySelectorAll('h4')).filter((h) => !h.closest('footer,nav,header'));
      for (const h of h4s) {
        const country = (h.textContent ?? '').replace(/\s+/g, ' ').trim();
        let anchors = collect(h);
        if (!anchors.length && h.parentElement) anchors = collect(h.parentElement);
        const seen = new Set<string>();
        for (const a of anchors) {
          const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim();
          const key = `${a.getAttribute('href')}|${text}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const li = a.closest('li');
          const singleAnchorItem = li && li.querySelectorAll('a').length === 1;
          const star =
            text.includes('*') ||
            (a.nextSibling?.textContent ?? '').trim().startsWith('*') ||
            (!!singleAnchorItem && (li!.textContent ?? '').includes('*'));
          out.push({ country, text, href: a.getAttribute('href'), star });
        }
      }
      return out;
    });

    return raw.map((r) => ({
      country: canonicalCountry(r.country),
      name: r.text.replace(/\*/g, '').replace(/\s+/g, ' ').trim(),
      isSatellite: r.star,
      href: r.href,
    }));
  }

  async countryNames(): Promise<string[]> {
    const sites = await this.readDirectory();
    return [...new Set(sites.map((s) => s.country))];
  }

  async sitesIn(country: string): Promise<DirectorySite[]> {
    const target = canonicalCountry(country);
    return (await this.readDirectory()).filter((s) => s.country === target);
  }

  /** Link for a site under a given country heading (document order: first match after the heading). */
  siteLink(countryHeading: string, cityPrefix: string): Locator {
    return this.page
      .locator(
        `xpath=//h4[normalize-space()="${countryHeading}"]/following::a[starts-with(normalize-space(.),"${cityPrefix}")][1]`,
      )
      .first();
  }

  async openSite(countryHeading: string, cityPrefix: string): Promise<void> {
    await this.siteLink(countryHeading, cityPrefix).click();
  }

  async showLocalRepresentatives(): Promise<void> {
    await this.representativesToggle.click();
  }

  async showAuctionSites(): Promise<void> {
    await this.auctionSitesToggle.click();
  }
}
