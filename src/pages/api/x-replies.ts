import type { APIRoute } from "astro";

import {
  CACHED,
  json,
  limitXReplies,
  NOT_CACHED,
  NOT_FOUND_CACHE,
  refuseXRequest,
} from "../../server/xApi";
import { fetchXReplies, X_POST_ID, XApiError } from "../../server/x";

// A post is served from Vercel's cache for an hour, and a day more while it
// refreshes, so repeat requests for the same conversation never reach FxTwitter
// again. Counts can lag by that much.

export const GET: APIRoute = async (context) => {
  const refused = await refuseXRequest(
    context,
    limitXReplies,
    "Too many replies loaded at once. Wait a minute and try again."
  );
  if (refused) {
    return refused;
  }

  const id = context.url.searchParams.get("id") ?? "";
  if (!X_POST_ID.test(id)) {
    return json({ error: "Invalid post id" }, 400, NOT_CACHED);
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
