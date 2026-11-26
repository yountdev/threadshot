// Images from Reddit's and X's CDNs are routed through our own proxy so that
// modern-screenshot can read them when generating the screenshot. The sample
// posts' pictures are served from this site already, and frames picked from a
// video are JPEG data URLs. A thread can be crafted, so any other scheme is
// dropped: a protocol-relative URL or a data: document would load in the
// browser and never pass the proxy's host allowlist.
const isLocalAsset = (src: string) =>
  src.startsWith("/") && !src.startsWith("//") && !src.includes("\\");

// videoFrame.capture writes these. SVG and HTML data URLs are not frames.
const isCapturedFrame = (src: string) => src.startsWith("data:image/jpeg;base64,");

export const proxiedImageSrc = (src: string | undefined): string | undefined => {
  if (!src || isLocalAsset(src) || isCapturedFrame(src)) {
    return src || undefined;
  }
  if (src.startsWith("https://")) {
    return `/api/img?u=${encodeURIComponent(src)}`;
  }
  return undefined;
};

// X serves its pictures at a named size unless the URL already picks one.
export const xImageSrc = (url: string, size: "small" | "large" = "large") =>
  proxiedImageSrc(url.startsWith("/") || url.includes("?") ? url : `${url}?name=${size}`);
