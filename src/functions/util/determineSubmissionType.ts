import type { RawSubmission, RedditLinkType } from "../../types/reddit";

// Direct files on Reddit's image hosts, including GIFs. A link that merely
// ends in .png, or whose path happens to contain those letters, stays
// external: the proxy will not fetch that host, and the screenshot should use
// the preview Reddit already returned. post_hint "image" names these same
// hosts; it is not trusted on its own, because a crafted thread can set it.
const REDDIT_IMAGE_HOST = /^(i|preview)\.redd\.it$/;

const isRedditImage = (url: string | undefined): boolean => {
  if (!url?.startsWith("https://")) {
    return false;
  }
  try {
    return REDDIT_IMAGE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

export const determineSubmissionType = (
  submission: RawSubmission
): RedditLinkType => {
  const { is_self, is_video, url, is_gallery, crosspost_parent } = submission;

  if (is_self) {
    return "self";
  } else if (is_video) {
    return "video";
  } else if (isRedditImage(url)) {
    return "image";
  } else if (is_gallery) {
    return "album";
  } else if (crosspost_parent) {
    return "crosspost";
  } else {
    return "external";
  }
};
