import type { APIRoute } from "astro";

import {
  allowedImageType,
  MAX_IMAGE_BYTES,
  parseImageTarget,
  readLimitedBody,
} from "../../server/img";
import { createRateLimit } from "../../server/rateLimit";
import { USER_AGENT } from "../../server/reddit";

// Same-origin proxy so modern-screenshot can read Reddit- and X-hosted images
// (CORS). A person loading a thread fans out a handful of these; scrapers do not.
const isLimited = createRateLimit({ limit: 60, windowMs: 60_000 });

const NOT_CACHED = { "Cache-Control": "no-store" };

// Vercel sets x-real-ip; Astro throws if it can't tell the address at all.
const visitorOf = (request: Request, address: () => string) => {
  const header = request.headers.get("x-real-ip");
  if (header) {
    return header;
  }
  try {
    return address();
  } catch {
    return "unknown";
  }
};

export const GET: APIRoute = async (context) => {
  const { url, request } = context;

  const retryAfter = isLimited(
    visitorOf(request, () => context.clientAddress)
  );
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

  const upstream = await fetch(target, {
    redirect: "error",
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
