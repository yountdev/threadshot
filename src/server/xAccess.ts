// Same-origin browser fetch from the editor sends Sec-Fetch-Site: same-origin
// (and usually Origin). Cross-site browser use is blocked; tools that send
// neither header (curl, scrapers) are refused so these unauthenticated relays
// are not an open FxTwitter/X proxy. Reddit credential routes require a
// matching Origin and their own rate limit — do not reuse this check there.
export const isAllowedXClient = (request: Request, url: URL): boolean => {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") {
    return false;
  }
  if (site === "same-origin" || site === "same-site") {
    return true;
  }
  const origin = request.headers.get("origin");
  return origin === url.origin;
};

// Cloudflare sets cf-connecting-ip; Astro throws if it can't tell the address.
export const visitorOf = (request: Request, address: () => string): string => {
  const header =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
  if (header) {
    return header;
  }
  try {
    return address();
  } catch {
    return "unknown";
  }
};
