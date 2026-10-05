import type { Locator, Page, Response } from '@playwright/test';

/**
 * Base for all page objects. Holds navigation + cross-cutting behaviour (consent banner).
 * Page objects expose *actions and reads*; assertions live in the specs.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

 protected async goto(path: string): Promise<Response | null> {
  const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  const title = await this.page.title();
  if (/access denied/i.test(title)) {
    throw new Error(
      `Blocked by bot protection at ${path} (HTTP ${response?.status()}). ` +
        'Run with channel "chrome"/headed, or ask for this IP to be allow-listed.',
    );
  }
  await this.dismissConsentIfPresent();
  return response;
}

  /** Best-effort cookie banner dismissal; never fails the test. */
  protected async dismissConsentIfPresent(): Promise<void> {
    const accept = this.page.locator('#onetrust-accept-btn-handler');
    await accept
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => accept.click())
      .catch(() => undefined);
  }

  protected headingByName(name: string | RegExp, level?: number): Locator {
    return this.page.getByRole('heading', { name, level }).first();
  }

  /** innerText of the element's parent — used to read a label+value pair rendered as siblings. */
  protected async textAround(locator: Locator): Promise<string> {
    return locator.evaluate((el) => ((el.parentElement ?? el) as HTMLElement).innerText);
  }
}
