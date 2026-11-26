// A fixed-window limit per key (a visitor's IP), kept in this isolate's memory.
// Used for /api/img. X post/reply routes use Cloudflare Workers rate-limit
// bindings in wrangler.jsonc via src/server/edge.ts instead.

interface Window {
  start: number;
  count: number;
}

const MAX_TRACKED = 10_000;

export const createRateLimit = ({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) => {
  const windows = new Map<string, Window>();

  // Seconds until `key` may try again, or 0 when this request is allowed.
  return (key: string, now = Date.now()): number => {
    let window = windows.get(key);
    if (!window || now - window.start >= windowMs) {
      if (!window && windows.size >= MAX_TRACKED) {
        windows.delete(windows.keys().next().value as string);
      }
      window = { start: now, count: 0 };
      windows.set(key, window);
    }
    window.count += 1;
    return window.count > limit
      ? Math.ceil((window.start + windowMs - now) / 1000)
      : 0;
  };
};
