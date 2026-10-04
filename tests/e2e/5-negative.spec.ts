import { test, expect } from '../../src/fixtures';

test.describe('E2E negative scenarios', { tag: ['@e2e', '@negative'] }, () => {
  test('N1 unknown yard slug yields a not-found experience, not a yard page', async ({ page, yardPage }) => {
    const res = await yardPage.open('this-yard-does-not-exist-xyz');
    const notFoundText = await page
      .getByText(/not found|404|doesn['’]t exist|can['’]t find|couldn['’]t find/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(res?.status() === 404 || notFoundText, `status=${res?.status()}`).toBe(true);
    await expect(yardPage.auctionEventsHeading).toHaveCount(0);
    await expect(yardPage.sellerHeading).toHaveCount(0);
  });

  test('N2 gibberish search returns no lots', async ({ page, searchPage }) => {
    await searchPage.open('zzqxjv-no-such-lot-98765');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const total = await searchPage.displayedTotal().catch(() => null);
    const emptyState = await page.getByText(/no results|0 results|didn['’]t match|no items/i).first().isVisible().catch(() => false);
    expect(total === 0 || emptyState, `total=${total}`).toBe(true);
    await expect(searchPage.lotCards.filter({ hasText: /zzqxjv/i })).toHaveCount(0);
  });

  test('N3 markup in the search query is not executed', async ({ page, searchPage }) => {
    let dialogSeen = false;
    page.on('dialog', async (d) => {
      dialogSeen = true;
      await d.dismiss();
    });
    await searchPage.open('<img src=x onerror=alert(1)>');
    await page.waitForLoadState('load');
    expect(dialogSeen).toBe(false);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('N4 directory does not mis-file cities under the wrong country', async ({ directoryPage }) => {
    await directoryPage.open();
    const us = await directoryPage.sitesIn('United States');
    const ca = await directoryPage.sitesIn('Canada');
    expect(us.some((s) => /^Edmonton\b/i.test(s.name))).toBe(false);
    expect(ca.some((s) => /^Phoenix\b/i.test(s.name))).toBe(false);
  });
});
