import assert from "node:assert/strict";
import { test } from "node:test";

import { isSameOrigin } from "../src/server/sameOrigin.ts";

const url = new URL("https://threadshot.app/api/reddit");

const requestOf = (origin?: string) =>
  new Request(url, { headers: origin === undefined ? {} : { origin } });

test("allows the page's own Origin and refuses a missing or foreign one", () => {
  assert.equal(isSameOrigin(requestOf("https://threadshot.app"), url), true);
  assert.equal(isSameOrigin(requestOf("https://evil.example"), url), false);
  assert.equal(isSameOrigin(requestOf(), url), false);
});
