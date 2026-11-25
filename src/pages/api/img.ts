import type { APIRoute } from "astro";

import { edgeCached } from "../../server/edge";
import {
  allowedImageType,
  MAX_IMAGE_BYTES,
  parseImageTarget,
  readLimitedBody,
} from "../../server/img";
import { createRateLimit } from "../../server/rateLimit";
import { visitorOf } from "../../server/xAccess";
import { USER_AGENT } from "../../server/reddit";

// Same-origin proxy so modern-screenshot can read Reddit- and X-hosted images
// (CORS). A person loading a thread fans out a handful of these; scrapers do not.
const isLimited = createRateLimit({ limit: 60, windowMs: 60_000 });

const NOT_CACHED = { "Cache-Control": "no-store" };

export const GET: APIRoute = async (context) => {
  const { url, request } = context;

  const retryAfter = isLimited(visitorOf(request, () => context.clientAddress));
  if (retryAfter) {
    return new Response("Too many images loaded at once. Wait a minute and try again.", {
      status: 429,
      headers: { ...NOT_CACHED, "Retry-After": String(retryAfter) },
    });
  }

  const target = parseImageTarget(url.searchParams.get("u") ?? "");
  if (!target) {
    return new Response("Host not allowed", { status: 400 });
  }

  return edgeCached(context, () => load(target));
};

const load = async (target: URL) => {
  // Workers have no "error" redirect mode; a redirect is not ok, so it fails.
  const upstream = await fetch(target, {
    redirect: "manual",
    headers: { "User-Agent": USER_AGENT },
  }).catch(() => null);
  const type = upstream ? allowedImageType(upstream.headers.get("content-type") ?? "") : null;
  if (!upstream?.ok || !type) {
    return new Response("Upstream image unavailable", { status: 502 });
  }

  const bytes = await readLimitedBody(upstream, MAX_IMAGE_BYTES);
  if (!bytes) {
    return new Response("Upstream image too large", { status: 502 });
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
};
