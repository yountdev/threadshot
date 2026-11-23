<script lang="ts">
  import UsersThree from "phosphor-svelte/lib/UsersThree";

  let { html }: { html: string } = $props();
</script>

<!-- The box X puts under a post that has a Community Note. -->
<section class="mt-3 overflow-hidden rounded-2xl border border-ap-line">
  <header
    class="flex items-center gap-2 border-b border-ap-line px-3 py-2.5 text-[15px] font-bold"
  >
    <span class="text-ap-link"><UsersThree size={18} weight="fill" /></span>
    Readers added context
  </header>
  <div class="md px-3 py-2.5 text-[15px] leading-5">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- cleaned by fetchXPost -->
    {@html html}
  </div>
</section>
