// Same-origin browser fetch from the editor sends Sec-Fetch-Site: same-origin
// (and usually Origin). Cross-site browser use is blocked; tools that send
// neither header (curl, scrapers) are refused so these unauthenticated relays
// are not an open FxTwitter/X proxy. Reddit credential routes keep their own
// softer Origin check — do not reuse this there.
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

// Vercel sets x-real-ip; Astro throws if it can't tell the address at all.
export const visitorOf = (request: Request, address: () => string): string => {
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
