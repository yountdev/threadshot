<script lang="ts">
  import type { Snippet } from "svelte";

  import { frameSize, presetById } from "../../lib/frame";
  import { editor } from "../../lib/editor.svelte";

  let {
    id,
    blurSrc,
    onwidth,
    children,
  }: {
    id?: string;
    blurSrc?: string;
    onwidth?: (width: number) => void;
    children: Snippet;
  } = $props();

  const CARD_WIDTH = 390;

  let cardHeight = $state(0);
  const preset = $derived(presetById(editor.framePreset));
  const size = $derived(
    frameSize(
      { width: CARD_WIDTH, height: cardHeight },
      editor.framePadding,
      preset.ratio
    )
  );
  const isBlur = $derived(editor.frameBackground === "blur" && Boolean(blurSrc));

  $effect(() => {
    onwidth?.(size.width);
  });

  // The blur fades out at the picture's edges, so it spills past the frame.
  const spill = $derived(editor.frameBlur * 2);
</script>

<div
  {id}
  class="relative flex items-center justify-center overflow-hidden"
  style:width="{size.width}px"
  style:height="{size.height}px"
  style:background={isBlur ? "#0f1419" : editor.frameColor}
  data-export-width={preset.pixels?.[0]}
  data-keep-size
>
  {#if isBlur}
    <img
      class="absolute max-w-none object-cover"
      style:top="-{spill}px"
      style:left="-{spill}px"
      style:width="calc(100% + {spill * 2}px)"
      style:height="calc(100% + {spill * 2}px)"
      style:filter="blur({editor.frameBlur}px)"
      alt=""
      src={blurSrc}
    />
    {#if editor.frameDim}
      <div
        class="absolute inset-0 bg-black"
        style:opacity={editor.frameDim / 100}
      ></div>
    {/if}
  {/if}
  <div
    class="relative overflow-hidden"
    style:width="{CARD_WIDTH}px"
    style:border-radius="{editor.frameRadius}px"
    style:box-shadow={editor.frameShadow
      ? "0 12px 40px rgb(0 0 0 / 0.28), 0 2px 8px rgb(0 0 0 / 0.12)"
      : "none"}
    bind:offsetHeight={cardHeight}
    data-keep-width
  >
    {@render children()}
  </div>
</div>
