import type { APIContext, APIRoute } from "astro";

import { edgeCached } from "../../server/edge";
import {
  CACHED,
  json,
  NOT_CACHED,
  NOT_FOUND_CACHE,
  refuseXClient,
  refuseXRateLimit,
} from "../../server/xApi";
import { fetchXReplies, X_POST_ID, XApiError } from "../../server/x";

// A post is kept in Cloudflare's cache for an hour, so repeat requests for the
// same conversation never reach FxTwitter again. Counts can lag by that much.

export const GET: APIRoute = async (context) => {
  const refused = refuseXClient(context);
  if (refused) {
    return refused;
  }

  const id = context.url.searchParams.get("id") ?? "";
  if (!X_POST_ID.test(id)) {
    return json({ error: "Invalid post id" }, 400, NOT_CACHED);
  }

  return edgeCached(context, () => load(id, context));
};

// Only requests the cache can't answer count towards the visitor's limit.
const load = async (id: string, context: APIContext) => {
  const refused = await refuseXRateLimit(
    context,
    "X_REPLIES_LIMIT",
    "Too many replies loaded at once. Wait a minute and try again."
  );
  if (refused) {
    return refused;
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
