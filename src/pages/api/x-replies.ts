import type { APIContext, APIRoute } from "astro";

import { edgeCached, limitVisitor } from "../../server/edge";
import { fetchXReplies, X_POST_ID, XApiError } from "../../server/x";

// A post is kept in Cloudflare's cache for an hour, so repeat requests for the
// same post never reach X. Counts can lag by that much, which an image of a post
// can live with.
const CACHED = { "Cache-Control": "public, max-age=300, s-maxage=3600" };
const NOT_FOUND_CACHE = { "Cache-Control": "public, max-age=60, s-maxage=60" };
const NOT_CACHED = { "Cache-Control": "no-store" };

const json = (body: unknown, status: number, headers: HeadersInit) =>
  Response.json(body, { status, headers });

export const GET: APIRoute = async (context) => {
  const { url, request } = context;
  // Browsers say where a request came from, so other sites' pages can't use
  // this server to fetch posts. Tools that send no such header are only limited.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Cross-site requests are not allowed." }, 403, NOT_CACHED);
  }

  const id = url.searchParams.get("id") ?? "";
  if (!X_POST_ID.test(id)) {
    return json({ error: "Invalid post id" }, 400, NOT_CACHED);
  }

  return edgeCached(context, () => load(id, context));
};

// Only requests the cache can't answer count towards the visitor's limit.
const load = async (id: string, context: APIContext) => {
  // A person makes a handful of these; a scraper makes thousands.
  const retryAfter = await limitVisitor("X_REPLIES_LIMIT", context);
  if (retryAfter) {
    return json(
      { error: "Too many replies loaded at once. Wait a minute and try again." },
      429,
      { ...NOT_CACHED, "Retry-After": String(retryAfter) }
    );
  }

  try {
    return json(await fetchXReplies(id), 200, CACHED);
  } catch (error) {
    const status = error instanceof XApiError ? error.status : 502;
    return json(
      { error: (error as Error).message },
      status,
      status === 404 ? NOT_FOUND_CACHE : NOT_CACHED
    );
  }
};
