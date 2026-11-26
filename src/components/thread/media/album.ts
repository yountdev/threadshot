import type { RawSubmission } from "../../../types/reddit";

export interface AlbumItem {
  id: string;
  url: string;
}

const sourceUrl = (
  source: { u?: string; gif?: string; mp4?: string } | undefined
): string | undefined => {
  const url = source?.u || source?.gif || source?.mp4;
  return typeof url === "string" && url ? url : undefined;
};

// Gallery order comes from gallery_data. Items Reddit marked invalid have no
// `s`, and animated ones point at gif or mp4 rather than u.
export const albumItems = (
  submission: Pick<RawSubmission, "media_metadata" | "gallery_data">
): AlbumItem[] => {
  const metadata = submission.media_metadata ?? {};
  const ordered = submission.gallery_data?.items
    ?.map((item) => item.media_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const ids = ordered?.length ? ordered : Object.keys(metadata);
  const items: AlbumItem[] = [];
  for (const id of ids) {
    const url = sourceUrl(metadata[id]?.s);
    if (url) {
      items.push({ id, url });
    }
  }
  return items;
};
