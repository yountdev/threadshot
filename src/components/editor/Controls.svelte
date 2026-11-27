<script lang="ts">
  import CaretDown from "phosphor-svelte/lib/CaretDown";
  import Check from "phosphor-svelte/lib/Check";
  import DownloadSimple from "phosphor-svelte/lib/DownloadSimple";
  import Export from "phosphor-svelte/lib/Export";

  import { formatDate, type DateFormat } from "../../functions/util/format";
  import { snippetFromSelection } from "../../lib/bodySnippet";
  import { editor, isTouchDevice } from "../../lib/editor.svelte";
  import {
    FRAME_SWATCHES,
    RATIO_PRESETS,
    SOCIAL_PRESETS,
    presetById,
  } from "../../lib/frame";
  import { SORT_TYPES } from "../../types/reddit";
  import NumberField from "../ui/NumberField.svelte";
  import Range from "../ui/Range.svelte";
  import Segmented from "../ui/Segmented.svelte";
  import Select from "../ui/Select.svelte";
  import Spinner from "../ui/Spinner.svelte";
  import Switch from "../ui/Switch.svelte";
  import CropDialog from "./CropDialog.svelte";
  import ExportPreview from "./ExportPreview.svelte";

  let {
    canDownload,
    hasBody,
    isAlbum,
    botCount,
    platform = "reddit",
    hasParent = false,
    hasLongText = false,
    hasCommunityNote = false,
    replyStatus = "ready",
    media = [],
    hasBlurImage = false,
  }: {
    canDownload: boolean;
    hasBody: boolean;
    isAlbum: boolean;
    botCount: number;
    platform?: "reddit" | "x";
    hasParent?: boolean;
    hasLongText?: boolean;
    hasCommunityNote?: boolean;
    replyStatus?: "loading" | "error" | "empty" | "ready";
    media?: { key: string; src: string; isVideo?: boolean }[];
    hasBlurImage?: boolean;
  } = $props();

  const frameBackgrounds = [
    { value: "color", text: "Color" },
    { value: "blur", text: "Blurred picture" },
  ] as const;
  // Posts without a picture have nothing to blur, so they use the color.
  const isFrameBlur = $derived(editor.frameBackground === "blur" && hasBlurImage);
  const framePixels = $derived(presetById(editor.framePreset).pixels);
  // The color picker only takes plain hex colors, so gradients show as white.
  const pickerColor = $derived(
    /^#[0-9a-f]{6}$/i.test(editor.frameColor) ? editor.frameColor : "#ffffff"
  );

  const shownCount = $derived(
    media.filter((item) => editor.isMediaShown(item.key)).length
  );
  const hasCrops = $derived(
    media.some((item) => editor.mediaCrops[item.key])
  );
  const hasFrames = $derived(
    media.some((item) => editor.mediaFrames[item.key])
  );
  const hasVideo = $derived(media.some((item) => item.isVideo));

  const resetCrops = () => {
    for (const item of media) {
      editor.setCrop(item.key, null);
      editor.setFrame(item.key, null);
    }
  };

  const isX = $derived(platform === "x");

  const isTouch = isTouchDevice();

  // Where the defaults went is shown on the button for a moment after saving.
  let saveResult = $state<"saved" | "failed" | null>(null);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveDefaults = () => {
    saveResult = editor.saveDefaults() ? "saved" : "failed";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => (saveResult = null), 2500);
  };

  // Advanced settings keep working while Basic hides them, so the tab counts any
  // that have been changed.
  let optionsMode = $state<"basic" | "advanced">("basic");
  const isAdvanced = $derived(optionsMode === "advanced");

  const optionsModes = [
    { value: "basic", text: "Basic" },
    { value: "advanced", text: "Advanced" },
  ] as const;

  const themes = [
    { value: "light", text: "Light" },
    { value: "dark", text: "Dark" },
  ] as const;

  const xReplySorts = [
    { value: "top", text: "Top" },
    { value: "likes", text: "Most liked" },
    { value: "new", text: "Newest" },
  ] as const;

  const sortOptions = SORT_TYPES.map((value) => ({
    value,
    text: value.charAt(0).toUpperCase() + value.slice(1),
  }));

  // Each format is shown as it would look, using today's date.
  const today = new Date();
  const dateFormats = (["short", "long", "us", "world", "iso"] as const).map(
    (value): { value: DateFormat; text: string } => ({
      value,
      text: formatDate(today, value),
    })
  );
  dateFormats.push({ value: "ago", text: "Time ago (9h)" });

  const timeDisplays = [
    { value: "today", text: "Today" },
    { value: "always", text: "Always" },
    { value: "off", text: "Off" },
  ] as const;

  const timeFormats = [
    { value: "12h", text: "12-hour" },
    { value: "24h", text: "24-hour" },
  ] as const;

  const inlineNames = [
    { value: "both", text: "Both" },
    { value: "name", text: "Name" },
    { value: "handle", text: "Handle" },
  ] as const;

  const redactStyles = [
    { value: "box", text: "Box" },
    { value: "scribble", text: "Scribble" },
    { value: "hide", text: "Hide" },
  ] as const;

  const bodyModes = [
    { value: "full", text: "Full" },
    { value: "snippet", text: "Snippet" },
    { value: "off", text: "Off" },
  ] as const;

  // A tap on the button can clear the highlight on touch screens, so the last
  // one is kept until it is used.
  $effect(() => {
    if (editor.postBody !== "snippet" || editor.bodySnippet) {
      return;
    }
    const onSelectionChange = () => {
      const snippet = snippetFromSelection(getSelection());
      if (snippet) {
        editor.bodySelection = snippet;
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  });

  const useSelection = () => {
    editor.bodySnippet = editor.bodySelection;
    editor.bodySelection = null;
    getSelection()?.removeAllRanges();
  };
</script>

{#snippet heading(text: string)}
  <h2 class="option-row text-sm font-semibold">{text}</h2>
{/snippet}

<!-- On small screens this sits between the preview and the options. -->
<button
  class="btn btn-primary w-full"
  disabled={!canDownload || editor.isDownloading}
  onclick={editor.download}
  type="button"
>
  {#if editor.isDownloading}
    <Spinner />
    Rendering
  {:else if isTouch}
    <Export size={20} weight="bold" />
    Share image
  {:else}
    <DownloadSimple size={20} weight="bold" />
    Download PNG
  {/if}
</button>

<div class="mt-6 flex flex-col border border-line bg-white px-4 lg:mt-4">
  <div
    class="grid grid-cols-2 border-b border-line"
    aria-label="Options"
    role="group"
  >
    {#each optionsModes as mode (mode.value)}
      <button
        class="options-tab"
        aria-pressed={optionsMode === mode.value}
        onclick={() => (optionsMode = mode.value)}
        type="button"
      >
        {mode.text}{#if mode.value === "advanced" && !isAdvanced && editor.changedAdvancedCount}{` (${editor.changedAdvancedCount})`}{/if}
      </button>
    {/each}
  </div>

  <div class="divide-y divide-line pt-2">
    <!-- Only shown for posts these apply to. -->
    {#if hasBody || (isX && (hasParent || hasLongText || hasCommunityNote))}
      <div class="py-2">
        {@render heading("Post")}
        {#if isX && hasParent}
          <Switch
            label="Show the posts it replies to"
            bind:checked={editor.showParentPost}
          />
        {/if}
        {#if isX && hasLongText}
          <Switch label="Full text of long posts" bind:checked={editor.showFullText} />
        {/if}
        {#if isX && hasCommunityNote}
          <Switch label="Community Note" bind:checked={editor.showCommunityNote} />
        {/if}
        {#if hasBody}
          <Segmented
            label="Post body"
            options={bodyModes}
            bind:value={editor.postBody}
          />
          {#if editor.postBody === "snippet"}
            <div class="flex flex-col gap-3 pt-2 pb-2">
              {#if editor.bodySnippet}
                <button
                  class="btn btn-secondary h-9 text-sm pointer-coarse:h-11"
                  onclick={() => (editor.bodySnippet = null)}
                  type="button"
                >
                  Choose a different snippet
                </button>
              {:else}
                <p class="text-sm text-ink-2">
                  Highlight text in the post, then use it as the snippet.
                </p>
                <button
                  class="btn btn-secondary h-9 text-sm pointer-coarse:h-11"
                  disabled={!editor.bodySelection}
                  onclick={useSelection}
                  type="button"
                >
                  Use highlighted text
                </button>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if isAdvanced && media.length}
      <div class="py-2">
        {@render heading(media.length > 1 ? "Pictures" : "Picture")}
        {#if media.length > 1}
          <p class="text-sm text-ink-2" aria-live="polite">
            {shownCount} of {media.length} shown. Tap one to leave it out.
          </p>
          <div class="grid grid-cols-4 gap-2 py-2">
            {#each media as item, index (item.key)}
              {@const isShown = editor.isMediaShown(item.key)}
              <button
                class={[
                  "relative aspect-square cursor-pointer overflow-hidden rounded-ui border-2 bg-canvas transition-colors duration-150",
                  isShown ? "border-accent" : "border-line",
                ]}
                aria-label="Picture {index + 1}"
                aria-pressed={isShown}
                onclick={() => editor.toggleMedia(item.key)}
                type="button"
              >
                <img
                  class={["size-full object-cover", !isShown && "opacity-40 grayscale"]}
                  alt=""
                  src={item.src}
                />
                {#if isShown}
                  <span
                    class="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-accent text-white"
                  >
                    <Check size={12} weight="bold" />
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
        {#if isAlbum}
          <NumberField
            label="Album columns"
            max={50}
            min={1}
            bind:value={editor.imageColumns}
          />
        {/if}
        <div class="option-row">
          <span class="text-sm text-ink-2">
            {hasVideo
              ? "Tap a picture in the preview to crop it, or a video to pick its frame."
              : "Tap a picture in the preview to crop it."}
          </span>
          {#if hasCrops || hasFrames}
            <button
              class="link shrink-0 cursor-pointer text-sm"
              onclick={resetCrops}
              type="button"
            >
              {hasFrames ? (hasCrops ? "Reset crops and frames" : "Reset frames") : "Reset crops"}
            </button>
          {/if}
        </div>
      </div>
    {/if}

    {#if isX}
      <div class="py-2">
        {@render heading("Replies")}
        <Switch label="Show replies" bind:checked={editor.showXReplies} />
        {#if editor.showXReplies}
          {#if isAdvanced}
            <Select
              class="w-30 pointer-coarse:w-36"
              label="Sort"
              options={xReplySorts}
              bind:value={editor.xReplySort}
            />
          {/if}
          <NumberField
            label="Replies"
            max={20}
            min={1}
            bind:value={editor.xReplyCount}
          />
          {#if replyStatus !== "ready"}
            <p class="text-sm text-ink-2" aria-live="polite">
              {replyStatus === "loading"
                ? "Loading replies…"
                : replyStatus === "error"
                  ? "Could not load the replies. Try again later."
                  : "This post has no replies yet."}
            </p>
          {/if}
        {/if}
      </div>
    {/if}

    {#if !isX}
      <div class="py-2">
        {@render heading("Comments")}
        <Switch label="Show comments" bind:checked={editor.showComments} />
        {#if editor.showComments}
          {#if isAdvanced}
            <Select
              class="w-30 pointer-coarse:w-36"
              label="Sort"
              options={sortOptions}
              bind:value={editor.commentSort}
            />
          {/if}
          <NumberField
            label="Top-level comments"
            max={50}
            min={0}
            bind:value={editor.topLevelComments}
          />
          {#if isAdvanced}
            <NumberField
              label="Replies per comment"
              max={50}
              min={0}
              bind:value={editor.commentReplies}
            />
            <NumberField
              label="Reply depth"
              max={50}
              min={0}
              bind:value={editor.replyDepth}
            />
            <Switch
              label={botCount ? `Hide bot comments (${botCount} found)` : "Hide bot comments (none found)"}
              bind:checked={editor.hideBots}
            />
          {/if}
        {/if}
      </div>
    {/if}

    <div class="py-2">
      {@render heading("Date and time")}
      <Switch label="Show date" bind:checked={editor.showDate} />
      {#if isAdvanced}
        {#if editor.showDate}
          <Select
            class="w-36 pointer-coarse:w-44"
            label="Date format"
            options={dateFormats}
            bind:value={editor.dateFormat}
          />
        {/if}
        <!-- "Time ago" already says how recent it is. -->
        {#if !editor.showDate || editor.dateFormat !== "ago"}
          <Segmented
            label="Show time"
            options={timeDisplays}
            bind:value={editor.timeDisplay}
          />
          {#if editor.timeDisplay !== "off"}
            <Segmented
              label="Time format"
              options={timeFormats}
              bind:value={editor.timeFormat}
            />
          {/if}
        {/if}
      {/if}
    </div>

    <div class="py-2">
      {@render heading("Privacy")}
      <Switch label="Redact usernames" bind:checked={editor.isCensorUsernames} />
      {#if !isX}
        <Switch label="Redact subreddit" bind:checked={editor.isCensorSubreddits} />
      {/if}
      {#if isAdvanced && (editor.isCensorUsernames || (!isX && editor.isCensorSubreddits))}
        <Segmented
          label="Redact with"
          options={redactStyles}
          bind:value={editor.redactStyle}
        />
      {/if}
    </div>

    <div class="py-2">
      {@render heading("Frame")}
      <Switch label="Add a frame" bind:checked={editor.frameEnabled} />
      {#if editor.frameEnabled}
        <label class="option-row">
          <span class="text-sm">Size</span>
          <span class="relative w-44 pointer-coarse:w-52">
            <select
              class="field option-control w-full appearance-none pr-6 pl-2 text-sm pointer-coarse:text-base"
              bind:value={editor.framePreset}
            >
              <optgroup label="Social media">
                {#each SOCIAL_PRESETS as preset (preset.id)}
                  <option value={preset.id}>{preset.text}</option>
                {/each}
              </optgroup>
              <optgroup label="Aspect ratio">
                {#each RATIO_PRESETS as preset (preset.id)}
                  <option value={preset.id}>{preset.text}</option>
                {/each}
              </optgroup>
            </select>
            <span
              class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center"
            >
              <CaretDown size={14} weight="bold" />
            </span>
          </span>
        </label>
        {#if framePixels}
          <p class="pb-1 text-right text-xs text-ink-2 tabular-nums">
            {framePixels[0]} × {framePixels[1]} px
          </p>
        {/if}
        {#if hasBlurImage}
          <Segmented
            label="Background"
            options={frameBackgrounds}
            bind:value={editor.frameBackground}
          />
        {/if}
        {#if isFrameBlur}
          <Range label="Blur" max={60} min={4} bind:value={editor.frameBlur} />
          <Range
            label="Darken"
            max={80}
            min={0}
            unit="%"
            bind:value={editor.frameDim}
          />
        {:else}
          <div class="flex flex-wrap gap-2 py-2" aria-label="Frame color" role="radiogroup">
            {#each FRAME_SWATCHES as swatch (swatch)}
              <button
                class={[
                  "size-7 cursor-pointer rounded-full border-2 pointer-coarse:size-9 transition-colors duration-150",
                  editor.frameColor === swatch ? "border-accent" : "border-line",
                ]}
                style:background={swatch}
                aria-checked={editor.frameColor === swatch}
                aria-label={swatch}
                onclick={() => (editor.frameColor = swatch)}
                role="radio"
                type="button"
              ></button>
            {/each}
            <label
              class={[
                "relative flex size-7 cursor-pointer pointer-coarse:size-9 items-center justify-center overflow-hidden rounded-full border-2 transition-colors duration-150",
                FRAME_SWATCHES.includes(editor.frameColor as never)
                  ? "border-line"
                  : "border-accent",
              ]}
              style:background="conic-gradient(#ff4f4f, #f4c542, #2f9e6e, #1d9bf0, #7c4dff, #ff4f81, #ff4f4f)"
              title="Custom color"
            >
              <span class="sr-only">Custom color</span>
              <input
                class="absolute inset-0 size-full cursor-pointer opacity-0"
                oninput={(event) => (editor.frameColor = event.currentTarget.value)}
                type="color"
                value={pickerColor}
              />
            </label>
          </div>
        {/if}
        {#if isAdvanced}
          <Range label="Padding" max={160} min={0} step={4} bind:value={editor.framePadding} />
          <Range label="Corners" max={40} min={0} bind:value={editor.frameRadius} />
          <Switch label="Shadow" bind:checked={editor.frameShadow} />
        {/if}
      {/if}
    </div>

    <div class="py-2">
      {@render heading("Appearance")}
      <Segmented label="Theme" options={themes} bind:value={editor.theme} />
      <Switch label="Hide watermark" bind:checked={editor.hideWatermark} />
      {#if isAdvanced}
        <Switch label={isX ? "X logo" : "Reddit logo"} bind:checked={editor.showLogo} />
        {#if isX}
          <Switch label="Profile pictures" bind:checked={editor.showXProfileIcons} />
          <Segmented
            label="Reply and quote names"
            options={inlineNames}
            bind:value={editor.xInlineNames}
          />
        {:else}
          <Switch label="Subreddit icon" bind:checked={editor.showSubredditIcon} />
          <Switch label="Profile pictures" bind:checked={editor.showProfileIcons} />
          <Switch label="Hide post tags" bind:checked={editor.hidePostTags} />
          <Switch label="Hide user flair" bind:checked={editor.hideUserFlair} />
        {/if}
      {/if}
    </div>
  </div>

  <div class="border-t border-line py-3">
    <button
      class="btn btn-secondary h-9 w-full text-sm pointer-coarse:h-11"
      onclick={saveDefaults}
      type="button"
    >
      <span aria-live="polite">
        {#if saveResult === "saved"}
          Saved to this browser's local storage
        {:else if saveResult === "failed"}
          Could not save: local storage is blocked
        {:else}
          Save as default
        {/if}
      </span>
    </button>
  </div>
</div>

<ExportPreview />
{#if editor.cropping}
  {#key editor.cropping}
    <CropDialog target={editor.cropping} />
  {/key}
{/if}
