// Set at build time by vite.define in astro.config.mjs.
declare const __BUILD_COMMIT__: string | null;
declare const __BUILD_VERSION__: string | null;
declare const __BUILD_TIME__: string;
// The repository REPO_HOST picks: see scripts/repository.mjs.
declare const __REPOSITORY__: {
  host: "gitlab" | "github";
  name: string;
  url: string;
  cloneUrl: string;
  newIssueUrl: string;
  archiveUrl: string;
};
