// A #t= fragment is base64, sometimes gzip. A few hundred kilobytes of gzip
// can expand without bound, so stop once the thread is larger than the editor
// can render. The shortcut already refuses a URL past about 1.9 MB of base64.
export const MAX_THREAD_BYTES = 16 * 1024 * 1024;

const GZIP_MAGIC_BYTE = 0x1f;

const readLimited = async (
  stream: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<Uint8Array> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Thread is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

// Decodes a #t= fragment to JSON. Gzip when the payload starts with the gzip
// magic byte; JSON never does. Throws when the result is not JSON or is larger
// than `maxBytes`.
export const decodeThreadJson = async (
  encoded: string,
  maxBytes = MAX_THREAD_BYTES
): Promise<unknown> => {
  const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.byteLength > maxBytes) {
    throw new Error("Thread is too large");
  }
  const body =
    bytes[0] === GZIP_MAGIC_BYTE
      ? await readLimited(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
          maxBytes
        )
      : bytes;
  return JSON.parse(new TextDecoder().decode(body));
};
