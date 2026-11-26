import assert from "node:assert/strict";
import { test } from "node:test";

import { isAllowedXClient, visitorOf } from "../src/server/xAccess.ts";

const url = new URL("https://threadshot.app/api/x");

const requestOf = (headers: Record<string, string>) =>
  new Request(url, { headers });

test("allows same-origin and same-site Sec-Fetch-Site", () => {
  assert.equal(
    isAllowedXClient(requestOf({ "sec-fetch-site": "same-origin" }), url),
    true
  );
  assert.equal(
    isAllowedXClient(requestOf({ "sec-fetch-site": "same-site" }), url),
    true
  );
});

test("allows a matching Origin when Sec-Fetch-Site is absent", () => {
  assert.equal(
    isAllowedXClient(requestOf({ origin: "https://threadshot.app" }), url),
    true
  );
});

test("refuses cross-site Sec-Fetch-Site even with a matching Origin", () => {
  assert.equal(
    isAllowedXClient(
      requestOf({
        "sec-fetch-site": "cross-site",
        origin: "https://threadshot.app",
      }),
      url
    ),
    false
  );
});

test("refuses scrapers that send neither same-origin signal", () => {
  assert.equal(isAllowedXClient(requestOf({}), url), false);
  assert.equal(
    isAllowedXClient(requestOf({ origin: "https://evil.example" }), url),
    false
  );
  assert.equal(
    isAllowedXClient(requestOf({ "sec-fetch-site": "none" }), url),
    false
  );
});

test("prefers cf-connecting-ip, then x-real-ip, then the platform address", () => {
  assert.equal(
    visitorOf(requestOf({ "cf-connecting-ip": "198.51.100.7" }), () => "10.0.0.1"),
    "198.51.100.7"
  );
  assert.equal(
    visitorOf(requestOf({ "x-real-ip": "203.0.113.9" }), () => "10.0.0.1"),
    "203.0.113.9"
  );
  assert.equal(visitorOf(requestOf({}), () => "10.0.0.1"), "10.0.0.1");
  assert.equal(
    visitorOf(requestOf({}), () => {
      throw new Error("no address");
    }),
    "unknown"
  );
});
