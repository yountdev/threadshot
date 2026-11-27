// Where the source code lives, for the links, install commands and version
// count. REPO_HOST picks the host at build time: "gitlab" (the default) or
// "github". Both mirror the same repository.

const OWNER = "yountdev";
const SLUG = "threadshot";
const BRANCH = "main";

const HOSTS = {
  gitlab: {
    name: "GitLab",
    url: `https://gitlab.com/${OWNER}/${SLUG}`,
    newIssue: "/-/issues/new",
    // GitLab names the archive's top folder after the commit, so the installer
    // matches it with a wildcard.
    archive: `https://gitlab.com/${OWNER}/${SLUG}/-/archive/${BRANCH}/${SLUG}-${BRANCH}.tar.gz`,
  },
  github: {
    name: "GitHub",
    url: `https://github.com/${OWNER}/${SLUG}`,
    newIssue: "/issues/new",
    archive: `https://codeload.github.com/${OWNER}/${SLUG}/tar.gz/${BRANCH}`,
  },
};

export const DEFAULT_REPO_HOST = "gitlab";

/**
 * @param {string | undefined} host
 * @returns {{ host: "gitlab" | "github", name: string, url: string, cloneUrl: string, newIssueUrl: string, archiveUrl: string }}
 */
export const repository = (host = process.env.REPO_HOST || DEFAULT_REPO_HOST) => {
  if (!Object.hasOwn(HOSTS, host)) {
    throw new Error(`REPO_HOST must be "gitlab" or "github", not "${host}".`);
  }
  const { name, url, newIssue, archive } = HOSTS[host];
  return {
    host,
    name,
    url,
    cloneUrl: `${url}.git`,
    newIssueUrl: url + newIssue,
    archiveUrl: archive,
  };
};
