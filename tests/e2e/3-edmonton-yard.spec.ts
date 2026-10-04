import { test, expect } from '../../src/fixtures';
import { EXPECTED } from '../../src/data/expectations';
import { DATE_RANGE, TIME_RANGE, WEEKDAY_RANGE } from '../../src/utils/patterns';

const Y = EXPECTED.yard;

test.describe('Scenario 3 — Edmonton yard page', { tag: '@e2e' }, () => {
  test.beforeEach(async ({ yardPage }) => {
    await yardPage.open(Y.slug);
  });

  test('3.1 details: address, office hours, phone', async ({ yardPage }) => {
    const address = yardPage.addressBlock(Y.street, 'T9E');
    await expect(address).toBeVisible();
    await expect(address).toContainText(Y.street);
    await expect(address).toContainText(/Nisku/i);
    await expect(address).toContainText(/\bAB\b/);
    expect((await address.innerText()).replace(/\s+/g, ' ')).toContain(Y.postal);

    const hours = await yardPage.officeHoursText();
    expect(hours).toMatch(WEEKDAY_RANGE);
    expect(hours).toMatch(TIME_RANGE);

    expect(await yardPage.phoneText(), 'telephone number shown').toBeTruthy();
  });

  test('3.2 auction events', async ({ yardPage }) => {
    await expect(yardPage.auctionEventsHeading).toBeVisible();
    const events = await yardPage.auctionEvents();
    console.log(`[info] auction event cards: ${events.length}`);
    expect(events.length).toBeGreaterThanOrEqual(1);
    for (const e of events) {
      expect(e.dateRange, `date range in "${e.raw}"`).toMatch(DATE_RANGE);
      expect(e.title, `title in "${e.raw}"`).not.toBe('');
    }
  });

  test('3.3 about this yard', async ({ yardPage }) => {
    await expect(yardPage.aboutHeading).toBeVisible();
    const text = await yardPage.aboutText();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/weekdays?/i);
    expect(text).toMatch(/drop-?\s?off/i);
    expect(text).toMatch(/inspection/i);
    expect(text).toMatch(/pick-?\s?up/i);
  });

  test('3.4 items in yard carousel (all slides, incl. off-screen)', async ({ yardPage }) => {
    const cats = await yardPage.yardCategories();
    console.log(`[info] items-in-yard categories: ${cats.length}`);
    expect(cats.length).toBeGreaterThan(Y.minCategories);
    for (const c of cats) {
      expect(c.name).not.toBe('');
      expect(Number.isFinite(c.quantity)).toBe(true);
    }
    const names = cats.map((c) => c.name);
    expect(names.some((n) => Y.requiredCategory.test(n)), 'Excavators').toBe(true);
    expect(names.some((n) => Y.oneOfCategories.some((re) => re.test(n))), 'one of the listed extra categories').toBe(true);
  });

  test('3.5 become-a-seller CTA is visible with a phone number (not submitted)', async ({ yardPage }) => {
    await expect(yardPage.sellerHeading).toBeVisible();
    await expect(yardPage.sellerForm()).toBeVisible();
    expect(await yardPage.sellerFormHasPhone()).toBe(true);
  });

  test('3.6 representatives tab shows at least one rep with territory and contact', async ({ yardPage }) => {
    await yardPage.openRepresentativesTab();
    await expect.poll(async () => (await yardPage.representatives()).length).toBeGreaterThanOrEqual(1);
    const reps = await yardPage.representatives();
    for (const r of reps) {
      expect(r.territory, `territory/region in ${JSON.stringify(r.lines)}`).toBeTruthy();
      expect(r.hasPhone || r.hasEmail, 'phone/mobile/email').toBe(true);
    }
  });
});
