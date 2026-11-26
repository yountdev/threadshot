import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALLOWED_IMAGE_HOST,
  allowedImageType,
  MAX_IMAGE_BYTES,
  parseImageTarget,
  readLimitedBody,
} from "../src/server/img.ts";

test("host matrix: Reddit and pbs.twimg https hosts are allowed", () => {
  const allowed = [
    "https://i.redd.it/abc.jpg",
    "https://preview.redd.it/abc.jpg",
    "https://external-preview.redd.it/abc.jpg",
    "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
    "https://i.redditmedia.com/abc.jpg",
    "https://pbs.twimg.com/media/abc.jpg",
    "https://pbs.twimg.com/profile_images/1/a_400x400.jpg",
  ];
  for (const href of allowed) {
    const target = parseImageTarget(href);
    assert.ok(target, href);
    assert.equal(target.href, new URL(href).href);
  }
});

test("host matrix: lookalikes, other twimg hosts, http, and IPs are rejected", () => {
  const blocked = [
    "https://evilredd.it/abc.jpg",
    "https://notredd.it.evil.com/abc.jpg",
    "https://video.twimg.com/ext_tw_video/1/pu/vid/720x1280/a.mp4",
    "https://abs.twimg.com/emoji/v2/72x72/1f600.png",
    "http://i.redd.it/abc.jpg",
    "https://127.0.0.1/abc.jpg",
    "https://8.8.8.8/abc.jpg",
    "https://example.com/abc.jpg",
    "https://redd.it.attacker.com/abc.jpg",
    "ftp://i.redd.it/abc.jpg",
    "not-a-url",
    "",
  ];
  for (const href of blocked) {
    assert.equal(parseImageTarget(href), null, href);
  }
});

test("ALLOWED_IMAGE_HOST rejects suffix lookalikes the route used to rely on alone", () => {
  assert.equal(ALLOWED_IMAGE_HOST.test("evilredd.it"), false);
  assert.equal(ALLOWED_IMAGE_HOST.test("i.redd.it"), true);
  assert.equal(ALLOWED_IMAGE_HOST.test("pbs.twimg.com"), true);
  assert.equal(ALLOWED_IMAGE_HOST.test("video.twimg.com"), false);
});

test("allows only jpeg, png, gif, webp, and avif", () => {
  for (const type of [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/jpeg; charset=binary",
    "IMAGE/PNG",
    " image/webp ",
  ]) {
    assert.ok(allowedImageType(type), type);
  }
});

test("rejects SVG and other Content-Types", () => {
  for (const type of [
    "image/svg+xml",
    "image/svg+xml; charset=utf-8",
    "image/svg",
    "image/x-icon",
    "image/bmp",
    "image/tiff",
    "text/html",
    "application/octet-stream",
    "application/json",
    "",
    "jpeg",
  ]) {
    assert.equal(allowedImageType(type), null, type);
  }
});

test("readLimitedBody rejects oversized Content-Length before reading", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  });
  const upstream = new Response(body, {
    headers: { "Content-Length": String(MAX_IMAGE_BYTES + 1) },
  });
  assert.equal(await readLimitedBody(upstream), null);
});

test("readLimitedBody rejects streams that exceed the cap", async () => {
  const chunk = new Uint8Array(1024).fill(7);
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < Math.ceil(MAX_IMAGE_BYTES / chunk.byteLength) + 2; i += 1) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
  assert.equal(await readLimitedBody(new Response(body), MAX_IMAGE_BYTES), null);
});

test("readLimitedBody returns bytes within the cap", async () => {
  const bytes = new Uint8Array([10, 20, 30, 40]);
  const got = await readLimitedBody(new Response(bytes), MAX_IMAGE_BYTES);
  assert.ok(got);
  assert.deepEqual([...new Uint8Array(got)], [10, 20, 30, 40]);
});
