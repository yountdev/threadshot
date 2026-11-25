import type { APIContext } from "astro";

import { type LimitName, limitVisitor } from "./edge";
import { isAllowedXClient } from "./xAccess";

// Cache headers for Cloudflare's Cache API (see edgeCached). CDN-Cache-Control
// is a Vercel-era name; Workers uses Cache-Control s-maxage instead.
export const CACHED = { "Cache-Control": "public, max-age=300, s-maxage=3600" };
export const NOT_FOUND_CACHE = { "Cache-Control": "public, max-age=60, s-maxage=60" };
export const NOT_CACHED = { "Cache-Control": "no-store" };

export const json = (body: unknown, status: number, headers: HeadersInit) =>
  Response.json(body, { status, headers });

// Shared gate for the unauthenticated X routes: browser same-origin signal,
// then the per-visitor Workers rate-limit binding. Returns a Response when
// the request is refused. Rate limiting runs inside the cache miss path so
// cache hits do not consume quota.
export const refuseXClient = (context: APIContext): Response | null => {
  const { request, url } = context;
  if (!isAllowedXClient(request, url)) {
    return json(
      { error: "This endpoint is only for the threadshot page." },
      403,
      NOT_CACHED
    );
  }
  return null;
};

export const refuseXRateLimit = async (
  context: APIContext,
  name: LimitName,
  tooManyMessage: string
): Promise<Response | null> => {
  const retryAfter = await limitVisitor(name, context);
  if (retryAfter) {
    return json({ error: tooManyMessage }, 429, {
      ...NOT_CACHED,
      "Retry-After": String(retryAfter),
    });
  }
  return null;
};
