import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { env } from '../config/env';
import { LocationsDirectoryPage } from '../pages/LocationsDirectoryPage';
import { YardPage } from '../pages/YardPage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { NextDataClient, type PageJson } from '../api/NextDataClient';
import { SearchClient } from '../api/SearchClient';
import { EXPECTED } from '../data/expectations';

type TestFixtures = {
  directoryPage: LocationsDirectoryPage;
  yardPage: YardPage;
  searchPage: SearchResultsPage;
};

type WorkerFixtures = {
  apiContext: APIRequestContext;
  nextData: NextDataClient;
  searchClient: SearchClient;
  /** Page JSON is fetched once per worker and shared (polite to a live site). */
  directoryJson: PageJson;
  edmontonJson: PageJson;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // --- e2e: page objects injected per test
  directoryPage: async ({ page }, use) => use(new LocationsDirectoryPage(page)),
  yardPage: async ({ page }, use) => use(new YardPage(page)),
  searchPage: async ({ page }, use) => use(new SearchResultsPage(page)),

  // --- api: worker-scoped clients
  apiContext: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({
        baseURL: env.baseUrl,
        extraHTTPHeaders: { 'accept-language': 'en-US,en;q=0.9' },
      });
      await use(ctx);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],
  nextData: [async ({ apiContext }, use) => use(new NextDataClient(apiContext)), { scope: 'worker' }],
  searchClient: [async ({ apiContext }, use) => use(new SearchClient(apiContext)), { scope: 'worker' }],
  directoryJson: [async ({ nextData }, use) => use(await nextData.getPageJson('/lp')), { scope: 'worker' }],
  edmontonJson: [
    async ({ nextData }, use) => use(await nextData.getPageJson(`/lp/${EXPECTED.yard.slug}`)),
    { scope: 'worker' },
  ],
});

export { expect };
