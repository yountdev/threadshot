import { isRawThread, type RawThread } from "./redditData";
import { decodeThreadJson } from "./threadFragment";

// The iOS shortcut can't open a window to post a thread to, so it goes to the
// editor in the same tab with the thread in the URL fragment, which browsers
// never send to a server. See scripts/build-shortcut.mjs.
export const THREAD_FRAGMENT = "#t=";

export const decodeThread = async (encoded: string): Promise<RawThread> => {
  const thread = await decodeThreadJson(encoded);
  if (!isRawThread(thread)) {
    throw new Error("Not a Reddit thread");
  }
  return thread;
};
