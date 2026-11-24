import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export type LimitName = "X_POST_LIMIT" | "X_REPLIES_LIMIT";

// Cloudflare's rate limits only count in whole periods, set in wrangler.jsonc.
const LIMIT_PERIOD_SECONDS = 60;

// Astro throws if it can't tell the address at all.
const visitorOf = (context: APIContext) => {
  try {
    return context.clientAddress;
  } catch {
    return "unknown";
  }
};

// Seconds until the visitor may try again, or 0 when this request is allowed.
export const limitVisitor = async (name: LimitName, context: APIContext) => {
  const { success } = await env[name].limit({ key: visitorOf(context) });
  return success ? 0 : LIMIT_PERIOD_SECONDS;
};

// Keeps a response with an s-maxage at this Cloudflare data centre for that
// long, so repeat requests never reach X or Reddit. The Cache API does nothing
// on *.workers.dev, only on a custom domain.
export const edgeCached = async (
  context: APIContext,
  load: () => Promise<Response>
) => {
  const cache = caches.default;
  const key = new Request(context.url.toString());
  const hit = await cache.match(key);
  if (hit) {
    return new Response(hit.body, hit);
  }
  const response = await load();
  if (/\bs-maxage=\d+/.test(response.headers.get("Cache-Control") ?? "")) {
    context.locals.cfContext.waitUntil(cache.put(key, response.clone()));
  }
  return response;
};
