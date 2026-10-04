import { test, expect } from '../../src/fixtures';
import { parseSearch } from '../../src/api/parsers/searchParser';

test.describe('API negative scenarios', { tag: ['@api', '@negative'] }, () => {
  test('N1 GET on the POST-only search endpoint is rejected', async ({ searchClient }) => {
    const res = await searchClient.get();
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('N2 malformed JSON body is rejected (not accepted as a search)', async ({ searchClient }) => {
    const res = await searchClient.post('{not-json');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('N3 nonsense search text returns 200 with zero hits', async ({ searchClient }) => {
    const r = await searchClient.search('zzqxjv-no-such-lot-98765');
    expect(r.status).toBe(200);
    expect(r.total).toBe(0);
    expect(r.records).toHaveLength(0);
  });

  test('N4 empty JSON object does not return a 5xx', async ({ searchClient }) => {
    const res = await searchClient.post({});
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) expect(parseSearch(await res.json()).total).not.toBeNull();
  });

  test('N5 unknown yard page has no yard payload (HTTP 404)', async ({ nextData }) => {
    const { response } = await nextData.getHtml('/lp/this-yard-does-not-exist-xyz');
    expect(response.status()).toBe(404);
  });

  test('N6 unknown build id on /_next/data is not served as data', async ({ nextData }) => {
    const res = await nextData.dataRoute('not-a-real-build-id', '/lp');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
