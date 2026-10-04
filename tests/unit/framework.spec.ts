import { test, expect } from '@playwright/test';
import { parseResultCount } from '../../src/utils/parse';
import { canonicalCountry } from '../../src/data/countries';
import { DATE_RANGE, TIME_RANGE, ITEM_COUNT } from '../../src/utils/patterns';
import { extractLocations } from '../../src/api/parsers/directoryParser';
import { parseYard } from '../../src/api/parsers/yardParser';
import { parseSearch } from '../../src/api/parsers/searchParser';

/** Offline tests: prove the helpers/parsers work without touching the live site. */
test.describe('framework helpers (offline)', { tag: '@unit' }, () => {
  test('parseResultCount', () => {
    expect(parseResultCount('1-60 of 2290')).toBe(2290);
    expect(parseResultCount('2.2k results for "Edmonton"')).toBe(2200);
    expect(parseResultCount('1,234 results')).toBe(1234);
    expect(parseResultCount('0 results for "x"')).toBe(0);
    expect(parseResultCount('hello')).toBeNull();
  });

  test('canonicalCountry maps names and codes', () => {
    expect(canonicalCountry('CAN')).toBe('Canada');
    expect(canonicalCountry('USA')).toBe('United States');
    expect(canonicalCountry('United Arab Emirates')).toBe('UAE');
    expect(canonicalCountry('Germany')).toBe('Germany');
  });

  test('patterns', () => {
    expect('Sep 22 - Sep 25 Edmonton, AB, CAN').toMatch(DATE_RANGE);
    expect('Sep 22 - 25').toMatch(DATE_RANGE);
    expect('8:00 AM - 4:30 PM').toMatch(TIME_RANGE);
    expect('Excavators 1,204 items').toMatch(ITEM_COUNT);
  });

  test('extractLocations: flat list and grouped list', () => {
    const flat = Array.from({ length: 12 }, (_, i) => ({
      name: `Site${i}`, country: i % 2 ? 'CAN' : 'USA', siteType: i % 3 ? 'Permanent' : 'Satellite',
    }));
    const locs = extractLocations({ props: { yards: flat } });
    expect(locs).toHaveLength(12);
    expect(locs[0]).toMatchObject({ country: 'United States', siteType: 'Satellite' });

    const grouped = extractLocations({ g: [
      { country: 'Canada', yards: [{ name: 'Edmonton', isSatellite: false }, { name: 'Calgary*', isSatellite: true }] },
      { country: 'United States', yards: [{ name: 'Phoenix', isSatellite: false }] },
    ] });
    expect(grouped.map((l) => `${l.country}:${l.name}:${l.siteType}`)).toEqual([
      'Canada:Edmonton:Permanent', 'Canada:Calgary:Satellite', 'United States:Phoenix:Permanent',
    ]);
  });

  test('parseYard: address, events, flattened itemsInYard', () => {
    const payload = { yard: { name: 'Edmonton', address: { line1: '1500 Sparrow Drive', city: 'Nisku', postal: 'T9E\u00a08H6' }, phone: '780-955-3355', officeHours: 'Mon - Fri 8am - 4pm' },
      upcomingEvents: [{ name: 'Edmonton, AB, CAN', startDate: '2026-09-22', endDate: '2026-09-25' }],
      itemsInYard: [{ group: [{ categoryLocalized: 'Excavators', totalAssets: 12 }], more: [{ categoryLocalized: 'Sprayers', totalAssets: 0 }] }] };
    const y = parseYard(payload);
    expect(y.yardName).toBe('Edmonton');
    expect(y.scopeText).toContain('T9E 8H6');
    expect(y.hasHours).toBe(true);
    expect(y.events).toHaveLength(1);
    expect(y.categories.map((c) => c.name)).toEqual(['Excavators', 'Sprayers']);
  });

  test('parseSearch', () => {
    const s = parseSearch({ results: { totalAmount: 2290, records: [{ assetDescription: '2019 CAT 320' }, { assetDescription: 'Trailer' }] } });
    expect(s.total).toBe(2290);
    expect(s.titles).toEqual(['2019 CAT 320', 'Trailer']);
  });
});
