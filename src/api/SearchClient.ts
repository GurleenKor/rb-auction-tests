import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../config/env';
import { parseSearch, type SearchSummary } from './parsers/searchParser';

export interface SearchResult extends SearchSummary {
  status: number;
  contentType: string;
  body: unknown;
}

/**
 * Client for POST /api/search.
 * The public docs don't publish the request body, so payloads are tried in order until one
 * yields HTTP 200 + a recognisable total. The winner is cached for the worker's lifetime.
 * Pin it explicitly with SEARCH_PAYLOAD_TEMPLATE (e.g. {"freeText":"{{text}}"}).
 */
export class SearchClient {
  private chosen: number | undefined;

  constructor(private readonly ctx: APIRequestContext) {}

  static candidates(text: string): Record<string, unknown>[] {
    if (env.searchPayloadTemplate) {
      return [JSON.parse(env.searchPayloadTemplate.replace(/\{\{text\}\}/g, JSON.stringify(text).slice(1, -1)))];
    }
    return [
      { searchText: text },
      { freeText: text },
      { searchParams: { freeText: text } },
      { query: text },
      { keyword: text },
    ];
  }

  private headers(text: string) {
    return {
      'content-type': 'application/json',
      accept: 'application/json',
      referer: `${env.baseUrl}/search?freeText=${encodeURIComponent(text)}`,
      origin: env.baseUrl,
    };
  }

  /** Raw POST with an arbitrary body — used by negative tests. */
  post(data: unknown, text = ''): Promise<APIResponse> {
    return this.ctx.post('/api/search', { headers: this.headers(text), data });
  }

  get(): Promise<APIResponse> {
    return this.ctx.get('/api/search', { headers: { accept: 'application/json' } });
  }

  async search(text: string): Promise<SearchResult> {
    const candidates = SearchClient.candidates(text);
    const order = this.chosen !== undefined ? [this.chosen] : candidates.map((_, i) => i);
    let last: SearchResult | undefined;
    for (const i of order) {
      const res = await this.post(candidates[i], text);
      const contentType = res.headers()['content-type'] ?? '';
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* non-JSON body */
      }
      last = { status: res.status(), contentType, body, ...parseSearch(body) };
      if (last.status === 200 && last.total !== null) {
        this.chosen = i;
        return last;
      }
    }
    return last!;
  }
}
