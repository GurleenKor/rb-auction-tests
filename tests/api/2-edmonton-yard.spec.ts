import { test, expect } from '../../src/fixtures';
import { EXPECTED } from '../../src/data/expectations';
import { parseYard } from '../../src/api/parsers/yardParser';
import { PHONE, WEEKDAY_RANGE, TIME_RANGE } from '../../src/utils/patterns';

const Y = EXPECTED.yard;

test.describe('API 2 — Edmonton yard page JSON', { tag: '@api' }, () => {
  test('A2.1 payload is JSON', async ({ edmontonJson }) => {
    expect(edmontonJson.status).toBe(200);
    expect(edmontonJson.nextData).toBeTruthy();
  });

  test('A2.2 yard name, address, phone, hours', async ({ edmontonJson }) => {
    const yard = parseYard(edmontonJson.pageProps);
    expect(yard.yardName, 'yard object found').toMatch(/^Edmonton/i);
    expect(yard.scopeText).toContain(Y.street);
    expect(yard.scopeText).toContain(Y.city);
    expect(yard.scopeText).toContain(Y.postal);
    expect(yard.scopeText).toMatch(PHONE);
    expect(yard.hasHours || WEEKDAY_RANGE.test(yard.scopeText) || TIME_RANGE.test(yard.scopeText), 'office/pickup hours').toBe(true);
  });

  test('A2.3 upcoming events', async ({ edmontonJson }) => {
    const { events } = parseYard(edmontonJson.pageProps);
    console.log(`[info] upcoming events: ${events.length}`);
    if (events.length === 0) test.info().annotations.push({ type: 'note', description: 'yard has no upcoming events' });
    else {
      expect(events.length).toBeGreaterThanOrEqual(1);
      for (const e of events) {
        expect(e.name, `event name in ${e.json}`).toBeTruthy();
        expect(e.start || e.end || e.range, `event date in ${e.json}`).toBeTruthy();
      }
      expect(events.some((e) => /edmonton|nisku/i.test(e.json)), 'an event refers to Edmonton/Nisku').toBe(true);
    }
  });

  test('A2.4 itemsInYard categories', async ({ edmontonJson }) => {
    const { categories } = parseYard(edmontonJson.pageProps);
    console.log(`[info] itemsInYard categories: ${categories.length}`);
    expect(categories.length).toBeGreaterThan(Y.minCategories);
    for (const c of categories) {
      expect(c.name).toBeTruthy();
      if (c.totalAssets !== undefined && c.totalAssets !== null) {
        expect(typeof c.totalAssets).toBe('number');
        expect(c.totalAssets as number).toBeGreaterThanOrEqual(0);
      }
    }
    expect(categories.some((c) => Y.requiredCategory.test(c.name)), 'Excavators').toBe(true);
  });
});
