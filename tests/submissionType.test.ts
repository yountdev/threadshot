import assert from "node:assert/strict";
import { test } from "node:test";

import { determineSubmissionType } from "../src/functions/util/determineSubmissionType.ts";
import type { RawSubmission } from "../src/types/reddit.ts";

const submission = (fields: Partial<RawSubmission>) =>
  determineSubmissionType({
    is_self: false,
    is_video: false,
    is_gallery: false,
    ...fields,
  } as RawSubmission);

test("treats Reddit-hosted files as images, including GIFs", () => {
  assert.equal(submission({ url: "https://i.redd.it/abc.png" }), "image");
  assert.equal(submission({ url: "https://i.redd.it/abc.gif" }), "image");
  assert.equal(submission({ url: "https://i.redd.it/abc" }), "image");
  assert.equal(
    submission({ url: "https://preview.redd.it/abc.webp?width=1080" }),
    "image"
  );
  assert.equal(
    submission({ url: "https://i.redd.it/abc.jpg", post_hint: "image" }),
    "image"
  );
});

test("leaves other links external so the preview card is used", () => {
  assert.equal(submission({ url: "https://i.imgur.com/abc.png" }), "external");
  assert.equal(submission({ url: "https://example.com/wiki/png" }), "external");
  assert.equal(
    submission({ url: "https://evil.example/a.jpg", post_hint: "image" }),
    "external"
  );
  assert.equal(submission({ url: "https://v.redd.it/abc" }), "external");
});

test("keeps self, video, gallery and crosspost ahead of a lookalike URL", () => {
  assert.equal(submission({ is_self: true, url: "https://i.redd.it/a.jpg" }), "self");
  assert.equal(submission({ is_video: true, url: "https://i.redd.it/a.jpg" }), "video");
  assert.equal(
    submission({ is_gallery: true, url: "https://www.reddit.com/gallery/abc" }),
    "album"
  );
  assert.equal(
    submission({
      crosspost_parent: "t3_abc",
      url: "https://www.reddit.com/r/pics/comments/abc/title/",
    }),
    "crosspost"
  );
});
