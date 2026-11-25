import type { APIContext } from "astro";

import { createSharedRateLimit } from "./rateLimit";
import { isAllowedXClient, visitorOf } from "./xAccess";

export const CACHED = {
  "Cache-Control": "public, max-age=300",
  "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};
export const NOT_FOUND_CACHE = { "Cache-Control": "public, max-age=60, s-maxage=60" };
export const NOT_CACHED = { "Cache-Control": "no-store" };

export const json = (body: unknown, status: number, headers: HeadersInit) =>
  Response.json(body, { status, headers });

// A person loads a handful of posts; replies hit FxTwitter harder, so their
// window is tighter. Counts are regional via Runtime Cache (see xAccess).
export const limitXPosts = createSharedRateLimit({
  name: "x",
  limit: 20,
  windowMs: 60_000,
});
export const limitXReplies = createSharedRateLimit({
  name: "x-replies",
  limit: 10,
  windowMs: 60_000,
});

type Limiter = (key: string) => Promise<number>;

// Shared gate for the unauthenticated X routes: browser same-origin signal,
// then the per-visitor limit. Returns a Response when the request is refused.
export const refuseXRequest = async (
  context: APIContext,
  isLimited: Limiter,
  tooManyMessage: string
): Promise<Response | null> => {
  const { request, url } = context;
  if (!isAllowedXClient(request, url)) {
    return json(
      { error: "This endpoint is only for the threadshot page." },
      403,
      NOT_CACHED
    );
  }

  const retryAfter = await isLimited(visitorOf(request, () => context.clientAddress));
  if (retryAfter) {
    return json({ error: tooManyMessage }, 429, {
      ...NOT_CACHED,
      "Retry-After": String(retryAfter),
    });
  }
  return null;
};
