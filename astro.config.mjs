import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";

import { repository } from "./scripts/repository.mjs";
import { versionAt } from "./scripts/version.mjs";

// The public site URL, used for canonical links. It is threadshot.app unless
// SITE_URL overrides it (for a fork or a staging copy).
const siteDomain = process.env.SITE_URL || "threadshot.app";

// Cloudflare's Workers Builds names the commit it is building, and may not
// have a .git folder.
const fullCommit = () => {
  if (process.env.WORKERS_CI_COMMIT_SHA) {
    return process.env.WORKERS_CI_COMMIT_SHA;
  }
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
};

const commit = fullCommit();
const repo = repository();

export default defineConfig({
  site: /^https?:\/\//i.test(siteDomain) ? siteDomain : `https://${siteDomain}`,
  output: "server",
  devToolbar: { enabled: false },
  // No astro:assets images or Astro sessions are used, so the adapter needs no
  // Images or KV binding.
  adapter: cloudflare({ imageService: "passthrough" }),
  session: false,
  integrations: [svelte()],
  markdown: {
    shikiConfig: {
      // Matches the dark blocks that Shiki used by default before.
      theme: "github-dark",
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Compiled in here because pages render per request in server output, where
    // a new Date() would be the time of the visit rather than of the build.
    define: {
      __BUILD_COMMIT__: JSON.stringify(commit),
      __BUILD_VERSION__: JSON.stringify(versionAt(commit)),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __REPOSITORY__: JSON.stringify(repo),
    },
  },
});
