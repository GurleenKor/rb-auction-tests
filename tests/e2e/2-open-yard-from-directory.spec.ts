import { test, expect } from '../../src/fixtures';

test.describe('Scenario 2 — Open a yard from the directory', { tag: '@e2e' }, () => {
  test.beforeEach(async ({ directoryPage }) => {
    await directoryPage.open();
  });

  test('2.1 Edmonton is listed under Canada and is not a satellite', async ({ directoryPage }) => {
    const ca = await directoryPage.sitesIn('Canada');
    const edmonton = ca.find((s) => /^Edmonton\b/i.test(s.name));
    expect(edmonton, 'Edmonton listed under Canada').toBeTruthy();
    expect(edmonton!.isSatellite).toBe(false);
  });

  test('2.2 clicking Edmonton opens the yard page', async ({ page, directoryPage, yardPage }) => {
    await directoryPage.openSite('Canada', 'Edmonton');
    await expect(page).toHaveURL(/\/lp\/edmonton-ab/i);
    await expect(yardPage.heading).toContainText(/Edmonton/i);
  });
});
