<script lang="ts">
  interface Props {
    value: number;
    min: number;
    max: number;
    step?: number;
    label: string;
    unit?: string;
  }

  let {
    value = $bindable(),
    min,
    max,
    step = 1,
    label,
    unit = "px",
  }: Props = $props();

  const uid = $props.id();
</script>

<div class="option-row">
  <label class="shrink-0 text-sm" for={uid}>{label}</label>
  <div class="flex min-w-0 items-center gap-2">
    <input
      id={uid}
      class="w-28 cursor-pointer accent-accent pointer-coarse:w-36"
      {max}
      {min}
      {step}
      type="range"
      bind:value
    />
    <span class="w-11 text-right text-sm text-ink-2 tabular-nums">
      {value}{unit}
    </span>
  </div>
</div>
