// Shared rules for the same-origin image proxy: which hosts and Content-Types
// are safe to forward, and how large a response may be.

export const ALLOWED_IMAGE_HOST =
  /(^|\.)(redd\.it|redditmedia\.com|redditstatic\.com)$|^pbs\.twimg\.com$/;

// SVG (and anything else) is rejected so a navigated proxy URL cannot run
// script on this origin. Parameters after `;` are ignored.
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

// Cap keeps the deployment from becoming an open CDN relay for huge assets.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const parseImageTarget = (raw: string): URL | null => {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }
  if (target.protocol !== "https:") {
    return null;
  }
  if (!ALLOWED_IMAGE_HOST.test(target.hostname)) {
    return null;
  }
  return target;
};

export const allowedImageType = (contentType: string): string | null => {
  const media = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_IMAGE_TYPES.has(media) ? media : null;
};

// Read at most `maxBytes` from an upstream body. Returns null when the stream
// is missing or larger than the cap (including a declared Content-Length).
export const readLimitedBody = async (
  upstream: Response,
  maxBytes = MAX_IMAGE_BYTES
): Promise<ArrayBuffer | null> => {
  const declared = upstream.headers.get("content-length");
  if (declared) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > maxBytes) {
      return null;
    }
  }

  const body = upstream.body;
  if (!body) {
    return new ArrayBuffer(0);
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
};
