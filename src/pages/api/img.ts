import type { APIRoute } from "astro";

import { edgeCached } from "../../server/edge";
import { USER_AGENT } from "../../server/reddit";

// Same-origin proxy so modern-screenshot can read Reddit- and X-hosted images
// (CORS).
const ALLOWED_HOST =
  /(^|\.)(redd\.it|redditmedia\.com|redditstatic\.com)$|^pbs\.twimg\.com$/;

export const GET: APIRoute = async (context) => {
  const { url } = context;
  let target: URL;
  try {
    target = new URL(url.searchParams.get("u") ?? "");
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOST.test(target.hostname)) {
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
  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !type.startsWith("image/")) {
    return new Response("Upstream image unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
};
