import { test, expect } from '../../src/fixtures';
import { EXPECTED } from '../../src/data/expectations';
import { canonicalCountry } from '../../src/data/countries';
import type { DirectorySite } from '../../src/pages/LocationsDirectoryPage';

const D = EXPECTED.directory;
const find = (sites: DirectorySite[], city: string) => sites.find((s) => new RegExp(`^${city}\\b`, 'i').test(s.name));

test.describe('Scenario 1 — Locations directory', { tag: '@e2e' }, () => {
  test.beforeEach(async ({ directoryPage }) => {
    await directoryPage.open();
  });

  test('1.1 page title/heading and intro text', async ({ page, directoryPage }) => {
    await expect(page).toHaveTitle("Our Auction Sites | Ritchie Bros. Auctioneers");
    await expect(directoryPage.heading).toBeVisible();
    await expect(directoryPage.introText).toBeVisible();
  });

  test('1.2 satellite-site asterisk note is visible', async ({ directoryPage }) => {
    await expect(directoryPage.satelliteNote).toBeVisible();
  });

  test('1.3 country groups (h4) include required countries', async ({ directoryPage }) => {
    const countries = await directoryPage.countryNames();
    console.log(`[info] country groups: ${countries.length} -> ${countries.join(', ')}`);
    expect(countries.slice(0, 2)).toEqual([...D.firstCountries]);
    for (const c of D.requiredCountries) expect(countries, `missing country ${c}`).toContain(canonicalCountry(c));
  });

  test('1.4 United States sites', async ({ directoryPage }) => {
    const us = await directoryPage.sitesIn('United States');
    console.log(`[info] US locations: ${us.length}`);
    expect(us.length).toBeGreaterThan(D.minUsSites);
    for (const city of D.usSites) expect(find(us, city), `missing US site ${city}`).toBeTruthy();
  });

  test('1.5 Canada sites', async ({ directoryPage }) => {
    const ca = await directoryPage.sitesIn('Canada');
    console.log(`[info] Canadian locations: ${ca.length}`);
    expect(ca.length).toBeGreaterThan(D.minCaSites);
    for (const city of D.caSites) expect(find(ca, city), `missing CA site ${city}`).toBeTruthy();
  });

  test('1.6 satellite vs permanent counts', async ({ directoryPage }) => {
    const sites = await directoryPage.readDirectory();
    const satellite = sites.filter((s) => s.isSatellite).length;
    const permanent = sites.length - satellite;
    console.log(`[info] satellite=${satellite} permanent=${permanent} total=${sites.length}`);
    expect(satellite).toBeGreaterThan(D.minSatellite);
    expect(permanent).toBeGreaterThan(D.minPermanent);
    expect(sites.length).toBeGreaterThan(D.minTotal);
  });

  test('1.7 known satellite and permanent sites', async ({ directoryPage }) => {
    const sites = await directoryPage.readDirectory();
    for (const c of D.knownSatellite) expect(find(sites, c)?.isSatellite, `${c} should be satellite`).toBe(true);
    for (const c of D.knownPermanent) expect(find(sites, c)?.isSatellite, `${c} should be permanent`).toBe(false);
  });

  test('1.9 switch Auction sites / Local representatives', async ({ directoryPage }) => {
    await expect(directoryPage.auctionSitesToggle).toBeVisible();
    await expect(directoryPage.representativesToggle).toBeVisible();
    await directoryPage.showLocalRepresentatives();
    await expect(directoryPage.representativesSearchPrompt).toBeVisible();
  });
});
