import { test, expect } from '../../src/fixtures';
import { EXPECTED } from '../../src/data/expectations';
import { extractLocations } from '../../src/api/parsers/directoryParser';
import { canonicalCountry } from '../../src/data/countries';

const A = EXPECTED.api;

test.describe('API 1 — Auction sites list (/lp page JSON)', { tag: '@api' }, () => {
  test('A1.1 payload is JSON and includes a list of locations', async ({ directoryJson }) => {
    expect(directoryJson.status).toBe(200);
    expect(typeof directoryJson.nextData).toBe('object');
    expect(extractLocations(directoryJson.pageProps).length).toBeGreaterThan(0);
  });

  test('A1.2–A1.6 counts, shape, known sites, site types, countries', async ({ directoryJson }) => {
    const locs = extractLocations(directoryJson.pageProps);

    // A1.2
    expect(locs.length).toBeGreaterThan(A.minLocations);

    // A1.3
    for (const l of locs) {
      expect(l.name, 'name').toBeTruthy();
      expect(l.countryRaw, `country for ${l.name}`).toBeTruthy();
    }

    // A1.4
    expect(locs.some((l) => /^Edmonton\b/i.test(l.name) && l.country === 'Canada'), 'Edmonton/Canada').toBe(true);
    expect(locs.some((l) => /^Phoenix\b/i.test(l.name) && l.country === 'United States'), 'Phoenix/USA').toBe(true);

    // A1.5
    for (const l of locs) expect(['Satellite', 'Permanent'], `site type for ${l.name}`).toContain(l.siteType);
    const satellite = locs.filter((l) => l.siteType === 'Satellite').length;
    const permanent = locs.filter((l) => l.siteType === 'Permanent').length;
    console.log(`[info] locations=${locs.length} satellite=${satellite} permanent=${permanent}`);
    expect(satellite).toBeGreaterThan(A.minSatellite);
    expect(permanent).toBeGreaterThan(A.minPermanent);

    // A1.6
    const countries = new Set(locs.map((l) => l.country));
    console.log(`[info] distinct countries=${countries.size}`);
    expect(countries.size).toBeGreaterThan(A.minCountries);
    expect(countries).toContain(canonicalCountry('United States'));
    expect(countries).toContain(canonicalCountry('Canada'));
  });

  test('extra: /_next/data route serves the same page as JSON', async ({ nextData, directoryJson }) => {
    test.skip(!directoryJson.buildId, 'no buildId in payload');
    const res = await nextData.dataRoute(directoryJson.buildId!, '/lp');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('json');
    expect(extractLocations(((await res.json()) as { pageProps: unknown }).pageProps).length).toBeGreaterThan(A.minLocations);
  });
});
