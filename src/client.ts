import { auth } from "./auth.js";
import { config } from "./config.js";

export type Query = Record<string, string | number | boolean | string[] | undefined>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  explode?: string[];
}

export class RedditAdsApiError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly body: unknown,
  ) {
    super(`Reddit Ads API ${status} on ${method} ${path}: ${JSON.stringify(body)}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(path: string, query: Query = {}, explode: string[] = []) {
  const base = new URL(`${config.apiBaseUrl}/`);
  const url = /^https?:\/\//.test(path)
    ? new URL(path)
    : path.startsWith(base.pathname)
      ? new URL(path, base.origin)
      : new URL(path.replace(/^\//, ""), base);
  if (url.origin !== base.origin) throw new Error(`Refusing to call non Reddit Ads URL ${url}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value) && explode.includes(key)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return url;
}

export async function request<T = unknown>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query, options.explode);
  const idempotent = method === "GET" || method === "DELETE";
  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${await auth.getAccessToken()}`,
        "User-Agent": config.userAgent,
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (response.status === 401 && !refreshed) {
      refreshed = true;
      await auth.invalidate();
      continue;
    }
    if ((response.status === 429 || (idempotent && response.status >= 500)) && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Math.min(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt, 30_000));
      continue;
    }

    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : { success: true, status: response.status };
    } catch {}
    if (!response.ok) throw new RedditAdsApiError(response.status, method, url.pathname, data);
    return data as T;
  }
}

interface Page {
  data?: unknown;
  pagination?: { next_url?: string | null };
}

function items(page: Page): unknown[] | undefined {
  if (Array.isArray(page.data)) return page.data;
  const metrics = (page.data as { metrics?: unknown } | undefined)?.metrics;
  return Array.isArray(metrics) ? metrics : undefined;
}

export async function paginate(
  method: string,
  path: string,
  options: RequestOptions = {},
  maxPages = 1,
) {
  const first = await request<Page>(method, path, options);
  const collected = items(first);
  if (maxPages <= 1 || !collected) return first;
  let page = first;
  for (let count = 1; count < maxPages && page.pagination?.next_url; count++) {
    page = await request<Page>(method, page.pagination.next_url, { body: options.body });
    collected.push(...(items(page) ?? []));
  }
  return { ...first, pagination: page.pagination };
}
