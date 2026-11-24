import assert from "node:assert/strict";
import { test } from "node:test";

import { exportScale, frameSize } from "../src/lib/frame.ts";

const card = { width: 390, height: 600 };

test("fit to post only adds the padding", () => {
  assert.deepEqual(frameSize(card, 32), { width: 454, height: 664 });
});

test("a tall card in a wide frame grows the width", () => {
  const size = frameSize(card, 32, 16 / 9);
  assert.equal(size.height, 664);
  assert.ok(Math.abs(size.width / size.height - 16 / 9) < 0.01);
});

test("a short card in a tall frame grows the height", () => {
  const size = frameSize({ width: 390, height: 200 }, 32, 9 / 16);
  assert.equal(size.width, 454);
  assert.ok(size.height >= 264);
  assert.ok(Math.abs(size.width / size.height - 9 / 16) < 0.01);
});

test("the frame always leaves the padding", () => {
  for (const ratio of [0.5, 9 / 16, 0.75, 1, 4 / 3, 16 / 9, 1200 / 627]) {
    for (const height of [100, 333.3, 777.7, 2400]) {
      const size = frameSize({ width: 390, height }, 24, ratio);
      assert.ok(size.width >= 390 + 48);
      assert.ok(size.height >= height + 48);
    }
  }
});

test("export scale matches the network's width when sharp enough", () => {
  assert.equal(exportScale(454, 1080), 1080 / 454);
  assert.equal(exportScale(800, 1080), 3);
  assert.equal(exportScale(454), 3);
});
