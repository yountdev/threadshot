import { getCache } from "@vercel/functions";

// A fixed-window limit per key (a visitor's IP), kept in this instance's memory.
// Prefer createSharedRateLimit for the public X routes; this helper is the
// fallback when that store throws, and for unit tests of the window math.

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

interface CountStore {
  get: (key: string) => Promise<unknown | null>;
  set: (
    key: string,
    value: unknown,
    options?: { ttl?: number; name?: string }
  ) => Promise<void>;
}

// Fixed-window limit keyed by visitor, stored in Vercel's Runtime Cache when
// available. That cache is shared across function instances in a region — a
// stronger brake than per-instance memory alone.
//
// Tradeoffs (no Upstash/KV wired in this repo):
// - Regional, not global: each Vercel region keeps its own counts.
// - get-then-set is not atomic, so concurrent requests can slightly overshoot.
// - Off-platform / local: @vercel/functions falls back to process memory.
// Exact global quotas would need Redis/KV; CDN caching of post bodies still
// keeps repeat id traffic off upstream.
export const createSharedRateLimit = ({
  name,
  limit,
  windowMs,
  store,
}: {
  name: string;
  limit: number;
  windowMs: number;
  store?: CountStore;
}) => {
  const cache: CountStore =
    store ?? getCache({ namespace: `threadshot:rl:${name}` });
  const memory = createRateLimit({ limit, windowMs });

  // Seconds until `key` may try again, or 0 when this request is allowed.
  return async (key: string, now = Date.now()): Promise<number> => {
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const cacheKey = `${key}:${windowStart}`;
    const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));

    let count: number;
    try {
      const current = await cache.get(cacheKey);
      count = typeof current === "number" && Number.isFinite(current) ? current : 0;
      count += 1;
      await cache.set(cacheKey, count, { ttl: retryAfter, name: `${name}-count` });
    } catch {
      return memory(key, now);
    }

    return count > limit ? retryAfter : 0;
  };
};
