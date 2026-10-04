import { test, expect } from '../../src/fixtures';
import { log } from '../../src/utils/log';

test.describe('Scenario 4 — Edmonton inventory search', { tag: '@e2e' }, () => {
  test('4.1 search view opens for Edmonton', async ({ page, searchPage }) => {
    await searchPage.open('Edmonton');
    await expect(page).toHaveURL(/\/search\?.*freeText=Edmonton/i);
    await expect(searchPage.totalHeader.or(searchPage.paginationTotal)).toContainText(/edmonton|results|of/i);
  });

  test('4.2 displayed total > 0; lots have titles; log total + first 5 titles', async ({ searchPage }) => {
    await searchPage.open('Edmonton');
    const total = await searchPage.displayedTotal();
    expect(total, 'could not parse a displayed total').not.toBeNull();
    expect(total!).toBeGreaterThan(0);

    const lots = await searchPage.firstPageLots();
    expect(lots.length).toBeGreaterThan(0);
    for (const lot of lots) {
      expect(lot.title, 'lot title').not.toBe('');
      if (lot.location !== null) expect(lot.location).not.toBe('');
      if (lot.date !== null) expect(lot.date).not.toBe('');
    }
    log('displayed total', total);
    log('first 5 titles', lots.slice(0, 5).map((l) => l.title));
  });
});
