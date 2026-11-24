// The few Workers runtime types the server uses. Wrangler's full runtime types
// clash with the DOM types the editor needs, so `npm run types` only writes the
// bindings (worker-configuration.d.ts) and these fill in the rest.

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface CacheStorage {
  readonly default: Cache;
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
