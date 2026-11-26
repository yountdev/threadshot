import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { test } from "node:test";

import { decodeThreadJson } from "../src/lib/threadFragment.ts";

const encode = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const thread = [
  { kind: "Listing", data: { children: [{ kind: "t3" }] } },
  { kind: "Listing", data: { children: [] } },
];

test("reads a plain or gzipped thread fragment", async () => {
  const json = new TextEncoder().encode(JSON.stringify(thread));
  assert.deepEqual(await decodeThreadJson(encode(json)), thread);
  assert.deepEqual(await decodeThreadJson(encode(gzipSync(json))), thread);
});

test("stops a gzip fragment once the decompressed thread is too large", async () => {
  const payload = Buffer.alloc(64, 0x61);
  await assert.rejects(
    () => decodeThreadJson(encode(gzipSync(payload)), 32),
    /too large/
  );
});
