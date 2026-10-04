import { test, expect } from '../../src/fixtures';
import { EXPECTED } from '../../src/data/expectations';
import { log } from '../../src/utils/log';

test.describe('API 3 — Edmonton inventory search (POST /api/search)', { tag: '@api' }, () => {
  test('A3.1–A3.4 status, total, first page, display names', async ({ searchClient }) => {
    const r = await searchClient.search(EXPECTED.api.searchText);

    expect(r.status).toBe(200); // A3.1
    expect(r.contentType).toContain('json');
    expect(r.body).toBeTruthy();

    expect(r.total, 'results.totalAmount').not.toBeNull(); // A3.2
    expect(r.total!).toBeGreaterThan(0);

    expect(r.records.length).toBeGreaterThan(0); // A3.3
    r.records.forEach((rec, i) => {
      expect(typeof rec.assetDescription, `record ${i} assetDescription`).toBe('string');
      expect((rec.assetDescription as string).trim(), `record ${i} assetDescription`).not.toBe('');
    });

    log('total count', r.total); // A3.4
    log('first 5 titles', r.titles.slice(0, 5));
  });
});
