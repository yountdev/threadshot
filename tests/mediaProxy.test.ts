import assert from "node:assert/strict";
import { test } from "node:test";

import { proxiedImageSrc, xImageSrc } from "../src/components/thread/media/proxy.ts";

test("serves this site's own files and captured frames directly", () => {
  assert.equal(proxiedImageSrc("/sample/shaping-board.jpg"), "/sample/shaping-board.jpg");
  assert.equal(
    proxiedImageSrc("data:image/jpeg;base64,abc"),
    "data:image/jpeg;base64,abc"
  );
});

test("proxies https images and drops every other scheme", () => {
  assert.equal(
    proxiedImageSrc("https://i.redd.it/abc.jpg"),
    "/api/img?u=https%3A%2F%2Fi.redd.it%2Fabc.jpg"
  );
  assert.equal(proxiedImageSrc("//attacker.example/pixel.png"), undefined);
  assert.equal(proxiedImageSrc("/\\attacker.example/pixel.png"), undefined);
  assert.equal(proxiedImageSrc("http://i.redd.it/abc.jpg"), undefined);
  assert.equal(proxiedImageSrc("javascript:alert(1)"), undefined);
  assert.equal(proxiedImageSrc("data:text/html,<script>"), undefined);
  assert.equal(proxiedImageSrc("data:image/svg+xml,<svg>"), undefined);
  assert.equal(proxiedImageSrc(undefined), undefined);
});

test("does not let a protocol-relative X URL pick up a size query", () => {
  assert.equal(xImageSrc("//pbs.twimg.com/media/a.jpg"), undefined);
  assert.equal(
    xImageSrc("https://pbs.twimg.com/media/a.jpg"),
    "/api/img?u=https%3A%2F%2Fpbs.twimg.com%2Fmedia%2Fa.jpg%3Fname%3Dlarge"
  );
});
