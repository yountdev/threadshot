// The page's fetch sets Origin. A missing Origin is a non-browser client,
// which must not drive Reddit token and listing calls through this worker.
export const isSameOrigin = (request: Request, url: URL) =>
  request.headers.get("origin") === url.origin;
