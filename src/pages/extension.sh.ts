import type { APIRoute } from "astro";

// Built once, with the download from whichever host REPO_HOST picks.
export const prerender = true;

const repo = __REPOSITORY__;

// The archive's top folder is threadshot-main on GitHub and threadshot-main-<commit>
// on GitLab, so the extension folder is matched with a wildcard. macOS's tar
// takes the pattern as it is.
const script = `#!/bin/sh
# Installs the Threadshot Safari extension:
#   curl -fsSL https://threadshot.app/extension.sh | sh
# It fetches the extension folder from ${repo.name} into a temporary folder and
# runs its install script. See extension/README.md.
set -eu

# Nothing runs until the last line, so a cut-off download can't run part of this.
main() {
  dir="$(mktemp -d)"
  trap 'rm -rf "$dir"' EXIT
  curl -fsSL ${repo.archiveUrl} |
    tar -xz -C "$dir" --strip-components=2 '*/extension'
  "$dir/install.sh"
}

main
`;

export const GET: APIRoute = () =>
  new Response(script, { headers: { "Content-Type": "text/x-shellscript; charset=utf-8" } });
