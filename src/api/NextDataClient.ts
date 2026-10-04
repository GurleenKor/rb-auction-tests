import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface PageJson {
  status: number;
  contentType: string;
  buildId: string | undefined;
  /** Full parsed __NEXT_DATA__ document */
  nextData: Record<string, unknown>;
  pageProps: unknown;
}

const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

/** Reads the Next.js page JSON (__NEXT_DATA__ or /_next/data route) for a page path. */
export class NextDataClient {
  constructor(private readonly ctx: APIRequestContext) {}

  async getHtml(path: string): Promise<{ response: APIResponse; html: string }> {
    const response = await this.ctx.get(path, { headers: { accept: 'text/html' } });
    return { response, html: await response.text() };
  }

  async getPageJson(path: string): Promise<PageJson> {
    const { response, html } = await this.getHtml(path);
    const status = response.status();
    const match = NEXT_DATA.exec(html);
    if (!match) {
      throw new Error(`No __NEXT_DATA__ in ${path} (HTTP ${status}). First 200 chars: ${html.slice(0, 200)}`);
    }
    const nextData = JSON.parse(match[1]) as Record<string, unknown>;
    const props = (nextData.props ?? {}) as Record<string, unknown>;
    return {
      status,
      contentType: response.headers()['content-type'] ?? '',
      buildId: typeof nextData.buildId === 'string' ? nextData.buildId : undefined,
      nextData,
      pageProps: props.pageProps ?? props,
    };
  }

  /** GET /_next/data/<buildId>/<path>.json */
  dataRoute(buildId: string, path: string): Promise<APIResponse> {
    const p = path.replace(/\/$/, '');
    return this.ctx.get(`/_next/data/${buildId}${p}.json`, { headers: { accept: 'application/json' } });
  }
}
