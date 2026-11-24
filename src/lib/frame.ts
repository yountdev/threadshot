export type FrameBackground = "color" | "blur";

export interface FramePreset {
  id: string;
  text: string;
  // Width over height. Absent for a frame that just wraps the card.
  ratio?: number;
  // The size the network asks for, in pixels, so the export can match it.
  pixels?: [number, number];
}

export const SOCIAL_PRESETS: readonly FramePreset[] = [
  { id: "instagram", text: "Instagram post", ratio: 4 / 5, pixels: [1080, 1350] },
  { id: "instagram-square", text: "Instagram square", ratio: 1, pixels: [1080, 1080] },
  { id: "story", text: "Story, Reels, TikTok", ratio: 9 / 16, pixels: [1080, 1920] },
  { id: "imessage", text: "iMessage", ratio: 3 / 4, pixels: [1170, 1560] },
  { id: "x", text: "X", ratio: 16 / 9, pixels: [1600, 900] },
  { id: "threads", text: "Threads", ratio: 4 / 5, pixels: [1080, 1350] },
  { id: "facebook", text: "Facebook", ratio: 1200 / 630, pixels: [1200, 630] },
  { id: "linkedin", text: "LinkedIn", ratio: 1200 / 627, pixels: [1200, 627] },
  { id: "pinterest", text: "Pinterest", ratio: 2 / 3, pixels: [1000, 1500] },
];

export const RATIO_PRESETS: readonly FramePreset[] = [
  { id: "fit", text: "Fit to post" },
  { id: "1:1", text: "1:1", ratio: 1 },
  { id: "4:5", text: "4:5", ratio: 4 / 5 },
  { id: "3:4", text: "3:4", ratio: 3 / 4 },
  { id: "2:3", text: "2:3", ratio: 2 / 3 },
  { id: "9:16", text: "9:16", ratio: 9 / 16 },
  { id: "4:3", text: "4:3", ratio: 4 / 3 },
  { id: "3:2", text: "3:2", ratio: 3 / 2 },
  { id: "16:9", text: "16:9", ratio: 16 / 9 },
];

export const FRAME_PRESETS = [...SOCIAL_PRESETS, ...RATIO_PRESETS];

export const presetById = (id: string) =>
  FRAME_PRESETS.find((preset) => preset.id === id) ?? RATIO_PRESETS[0];

// Plain colors, then a few gradients, all as CSS backgrounds.
export const FRAME_SWATCHES = [
  "#ffffff",
  "#e9edf0",
  "#0f1419",
  "#bf3b0f",
  "#f4c542",
  "#2f9e6e",
  "#1d9bf0",
  "#7c4dff",
  "linear-gradient(135deg, #ff9a5a, #ff4f81)",
  "linear-gradient(135deg, #42c3f7, #2b5fd9)",
  "linear-gradient(135deg, #b9f0c8, #3aa17e)",
  "linear-gradient(135deg, #2b2e4a, #0f1419)",
] as const;

// The smallest frame of the preset's shape that fits the card with at least
// the padding on every side. Sizes are in CSS pixels and whole.
export const frameSize = (
  card: { width: number; height: number },
  padding: number,
  ratio?: number
) => {
  const minWidth = Math.ceil(card.width + padding * 2);
  const minHeight = Math.ceil(card.height + padding * 2);
  if (!ratio) {
    return { width: minWidth, height: minHeight };
  }
  if (minWidth / minHeight >= ratio) {
    return { width: minWidth, height: Math.round(minWidth / ratio) };
  }
  const width = Math.ceil(minHeight * ratio);
  return { width, height: Math.max(minHeight, Math.round(width / ratio)) };
};

// Sharp type needs at least twice the CSS size, so a frame wider than half the
// network's size is exported larger than asked, in the same shape.
export const exportScale = (frameWidth: number, targetWidth?: number) => {
  if (!targetWidth) {
    return 3;
  }
  const scale = targetWidth / frameWidth;
  return scale >= 2 ? scale : 3;
};
