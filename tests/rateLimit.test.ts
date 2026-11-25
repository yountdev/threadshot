import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createRateLimit,
  createSharedRateLimit,
} from "../src/server/rateLimit.ts";

test("allows the limit, then asks to wait until the window ends", () => {
  const isLimited = createRateLimit({ limit: 2, windowMs: 60_000 });
  assert.equal(isLimited("a", 0), 0);
  assert.equal(isLimited("a", 1000), 0);
  assert.equal(isLimited("a", 2000), 58);
  assert.equal(isLimited("b", 2000), 0);
  assert.equal(isLimited("a", 60_000), 0);
});

test("shared rate limit counts across the store, then asks to wait", async () => {
  const values = new Map<string, unknown>();
  const store = {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      values.set(key, value);
    },
  };
  const isLimited = createSharedRateLimit({
    name: "test",
    limit: 2,
    windowMs: 60_000,
    store,
  });

  assert.equal(await isLimited("a", 1_000), 0);
  assert.equal(await isLimited("a", 2_000), 0);
  assert.equal(await isLimited("a", 3_000), 57);
  assert.equal(await isLimited("b", 3_000), 0);
  assert.equal(await isLimited("a", 61_000), 0);
});

test("falls back to memory when the shared store throws", async () => {
  const store = {
    get: async () => {
      throw new Error("cache down");
    },
    set: async () => {
      throw new Error("cache down");
    },
  };
  const isLimited = createSharedRateLimit({
    name: "fallback",
    limit: 1,
    windowMs: 60_000,
    store,
  });

  assert.equal(await isLimited("a", 0), 0);
  assert.equal(await isLimited("a", 1_000), 59);
});
