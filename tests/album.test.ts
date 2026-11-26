import assert from "node:assert/strict";
import { test } from "node:test";

import { albumItems } from "../src/components/thread/media/album.ts";

test("walks gallery order and skips items with no picture", () => {
  const items = albumItems({
    gallery_data: { items: [{ media_id: "second" }, { media_id: "missing" }, { media_id: "first" }] },
    media_metadata: {
      first: { s: { u: "https://i.redd.it/first.jpg" } },
      second: { s: { gif: "https://i.redd.it/second.gif", mp4: "https://i.redd.it/second.mp4" } },
      missing: {},
      extra: { s: { u: "https://i.redd.it/extra.jpg" } },
    },
  });
  assert.deepEqual(
    items.map((item) => item.url),
    ["https://i.redd.it/second.gif", "https://i.redd.it/first.jpg"]
  );
});

test("falls back to metadata order when the gallery list is absent", () => {
  const items = albumItems({
    media_metadata: {
      one: { s: { u: "https://preview.redd.it/one.jpg" } },
      two: { s: { mp4: "https://preview.redd.it/two.mp4" } },
    },
  });
  assert.deepEqual(items.map((item) => [item.id, item.url]), [
    ["one", "https://preview.redd.it/one.jpg"],
    ["two", "https://preview.redd.it/two.mp4"],
  ]);
});
