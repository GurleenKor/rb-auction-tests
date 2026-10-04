# rbauction.com Locations — Test Automation Framework

Playwright + TypeScript framework covering **e2e** and **API** tests for the public
Ritchie Bros. locations pages (`/lp`, `/lp/edmonton-ab`, `/search`, `POST /api/search`).

> **Production safety:** tests are strictly read-only. They never create accounts, place bids, or
> submit the *Become a seller* form — `YardPage` intentionally exposes **no** submit method.
> Default concurrency is 2 workers and page JSON is fetched once per worker.

## Quick start

```bash
npm install
npm run install:browsers     # downloads Chromium (needed for e2e only)
npm test                     # unit + api + e2e
```

| Command | What it runs |
|---|---|
| `npm run test:e2e` | Browser scenarios 1–4 + negative e2e |
| `npm run test:api` | API 1–3 + negative API |
| `npm run test:unit` | Offline tests for helpers/parsers (no network) |
| `npm run test:negative` | Only `@negative` tests (both layers) |
| `npm run test:headed` | e2e with a visible browser |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run report` | Open the HTML report |

Requirements: Node 18+ (20 recommended). Copy `.env.example` to `.env` to override settings
(`BASE_URL`, `WORKERS`, `SEARCH_PAYLOAD_TEMPLATE`, `LOT_CARD_SELECTOR`, `LOT_TITLE_SELECTOR`).
Reports: `playwright-report/` (HTML), `reports/junit.xml`; traces/screenshots on failure.

## Architecture

```
src/
  config/env.ts            all env/config reads in one place
  data/expectations.ts     thresholds & expected values — shared by e2e AND api (single source of truth)
  data/countries.ts        country alias normaliser (USA/CAN/United States…)
  utils/                   pure helpers: parseResultCount ("2.2k", "1-60 of 2290"), regex patterns, log
  pages/                   Page Object Model
    BasePage.ts              navigation, consent-banner handling, shared helpers
    LocationsDirectoryPage   /lp
    YardPage                 /lp/<slug>
    SearchResultsPage        /search?freeText=
  api/
    NextDataClient.ts        fetches page JSON (__NEXT_DATA__ and /_next/data route)
    SearchClient.ts          POST /api/search
    parsers/                 ADAPTER layer: the only code that knows payload field names
  fixtures/index.ts        Playwright fixtures: page objects (test-scoped), API clients + cached JSON (worker-scoped)
tests/
  e2e/  api/  unit/        one Playwright project each (see playwright.config.ts)
```

Design principles applied

- **Page Object Model** — locators and DOM reading live in `pages/`; specs contain only intent + assertions.
- **Fixtures = dependency injection** — specs receive `directoryPage`, `yardPage`, `searchClient`, … no `new` in tests.
- **Adapter layer for unstable contracts** — `/lp` and `/lp/<slug>` JSON shapes are undocumented; parsers locate
  data structurally (largest array of yard-like objects, `itemsInYard` → nodes with `categoryLocalized`, …) and all
  field-name guesses sit in a few constant lists at the top of each parser. A schema change is a one-file fix.
- **Single source of truth** for expectations (`EXPECTED`), so e2e and API thresholds can't diverge.
- **Live-data-safe assertions** — counts are thresholds, totals are parsed from the page, lots are never iterated for counts.
- **Carousel counting reads the DOM, not visibility**, so off-screen slides are counted; clones are de-duplicated by name.
- **Offline unit project** verifies helpers/parsers without hitting production.
- Tags: `@e2e`, `@api`, `@unit`, `@negative`.

## Test map

| Spec | Covers |
|---|---|
| `e2e/1-locations-directory` | 1.1–1.7, 1.9 |
| `e2e/2-open-yard-from-directory` | 2.1, 2.2 |
| `e2e/3-edmonton-yard` | 3.1–3.6 |
| `e2e/4-edmonton-search` | 4.1, 4.2 (logs total + first 5 titles) |
| `e2e/5-negative` | unknown yard slug; gibberish search; markup in query not executed; cities not mis-filed under wrong country |
| `api/1-auction-sites` | A1.1–A1.6 (+ `/_next/data` route check) |
| `api/2-edmonton-yard` | A2.1–A2.4 |
| `api/3-edmonton-search` | A3.1–A3.4 |
| `api/4-negative` | GET on POST endpoint; malformed JSON; nonsense query → 0 hits; empty body ≠ 5xx; unknown yard 404; bad buildId |

## Calibration status

Reviewed against the rendered markup of `/lp` and `/lp/edmonton-ab` (heading levels, link structure, text).
Not yet executed in a browser against production.

Verified from the live markup
- `/lp`: h1 "Locations", country groups are `h4` followed by lists of `/lp/<slug>` links, asterisk is inside the link text
  (`Calgary, AB*`), expected countries/cities are present. The intro sentence also contains "auction sites", so the
  Auction sites / Local representatives toggles are matched with anchored text.
- `/lp/edmonton-ab`: the yard name is an **h3** (not h1); address/hours/phone, events (`Nov 3 - Nov 6 …`) and the
  About text match the patterns used; items-in-yard cards are anchors to `/cp/<slug>?freeText=Edmonton`
  (event cards also say "N Items", so the carousel is matched by href, not by text); representative cards are
  h4 name → territory line → role → Mobile/Phone/Email.

Still unverified (the search page blocks automated fetching for my tooling)
1. **`POST /api/search` body** — `SearchClient` tries likely bodies and caches the first returning `results.totalAmount`.
   Pin the real one with `SEARCH_PAYLOAD_TEMPLATE='{"freeText":"{{text}}"}'` (DevTools → Network on `/search?freeText=Edmonton`).
2. **Lot-card selectors** on `/search` — override with `LOT_CARD_SELECTOR` / `LOT_TITLE_SELECTOR`.
3. **`__NEXT_DATA__` field names** (site type, country, event dates) — edit the key lists atop `src/api/parsers/*`.
4. If bot protection blocks headless traffic, use `npm run test:headed`.
