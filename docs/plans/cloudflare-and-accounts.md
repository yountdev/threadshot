# Cloudflare move and passkey accounts

A plan for moving threadshot.app from Vercel to Cloudflare Workers, then adding
optional accounts that sync each visitor's saved defaults across devices.

## Decisions

| Area | Decision |
| --- | --- |
| Hosting | Cloudflare Workers, moved **before** any auth work |
| Database | Cloudflare D1 (SQLite) |
| Sign-in | Passkeys only. No email, no password |
| Account recovery | One-time recovery codes shown when the account is made |
| Auth library | Better Auth, with its passkey plugin |
| What syncs | The saved defaults ("Save as default") only |
| Reddit keys | Stay in the browser. Never sent to the server for storage |
| Conflicts | The account's settings win, with a one-tap "keep this browser's" |
| Where sign-in appears | A "Sync with a passkey" link under Save as default, and an account menu in the header once signed in |
| Signed-out visitors | Unchanged: settings stay in local storage, no account needed |

## Principles

- Accounts are optional. Every feature works signed out, exactly as today.
- Store as little as possible: no email, no name, no IP addresses, no Reddit keys.
- Each phase ships and is checked on its own before the next starts.
- Settings coming from the server are treated as untrusted input, the same as
  local storage is now.

---

## Phase 1: move to Cloudflare Workers

### Goal

The same site, served by Cloudflare Workers, with no visible change for
visitors and no loss of caching or abuse protection.

### Work

1. **Adapter.** Replace `@astrojs/vercel` with `@astrojs/cloudflare` and add
   `wrangler` as a dev dependency. Output stays `server`.
2. **Wrangler config.** Add `wrangler.jsonc` with the Worker name, a current
   `compatibility_date`, the `nodejs_compat` flag (only if a dependency needs
   it), the static assets binding, and the rate-limit bindings below.
3. **Remove Vercel leftovers.** Delete `scripts/vercel-node-runtime.mjs`, drop it
   from the `build` script, and remove `.vercel` handling where it no longer
   applies. Keep `.vercel` in `.gitignore` until the Vercel project is shut down.
4. **Build metadata.** `astro.config.mjs` and `scripts/version.mjs` read
   `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_REPO_OWNER` and `VERCEL_GIT_REPO_SLUG`.
   Read Cloudflare Workers Builds' `WORKERS_CI_COMMIT_SHA` first, keep the
   Vercel names as a fallback during the switch-over, then remove them.
5. **Visitor address.** `/api/x` and `/api/x-replies` read `x-real-ip`, which is
   a Vercel header. Read `cf-connecting-ip` instead.
6. **Rate limiting.** The current limit is a `Map` in memory. Workers isolates
   are short-lived and many, so that count would barely hold. Use Cloudflare's
   Workers rate-limiting binding (one per limit, e.g. `X_POST_LIMIT` at 30 per
   minute), keyed by the visitor's address. Keep `createRateLimit` as the
   fallback for `astro dev` and for tests, where the binding does not exist.
7. **Edge caching.** Vercel caches function responses from `CDN-Cache-Control`
   and `s-maxage`. Cloudflare does not cache a Worker's own responses that way.
   Wrap `/api/x` (one hour fresh, a day stale) and `/api/img` (one day) with the
   Workers Cache API (`caches.default`), keyed by the request URL, so repeat
   requests for the same post or picture do not reach X or Reddit.
   `/api/x-replies` keeps its current headers.
8. **Runtime check of each route.**

   | Route | Concern |
   | --- | --- |
   | `/api/img` | Streams an upstream image body. Fine on Workers; add caching (above) |
   | `/api/x` | Several upstream fetches per post; check CPU time stays well under the limit |
   | `/api/x-replies` | Same as `/api/x` |
   | `/api/reddit` | Uses `crypto.subtle`, available on Workers |
   | `/api/users` | Up to five parallel Reddit fetches; within the subrequest limit |
   | `/api/resolve` | Follows a Reddit share link; check redirect handling |

9. **Docs.** Update the README (hosting, deploy, environment variables) and
   `.env.example`. Fix the comment in `src/layouts/Base.astro` about the old
   `*.vercel.app` address once that address is retired.
10. **Deploy setup.** Connect the GitHub repository to Cloudflare Workers Builds
    (build `npm run build`, deploy `npx wrangler deploy`), set `SITE_URL` if
    needed, and attach `threadshot.app` as a custom domain.

### Cut-over

1. Deploy to the `*.workers.dev` address and test every route there: an X post,
   an X post with replies, a Reddit post loaded with a key, the bookmark, the
   iOS Shortcut, the Safari extension, image export and sharing on iPhone.
2. Lower the DNS TTL, then point `threadshot.app` at the Worker.
3. Keep the Vercel deployment running for a week as a rollback, then shut it
   down and remove the remaining Vercel references.

### Done when

- Every route above works on the Worker, in production.
- A repeat request for the same X post is served from the cache.
- The rate limit stops more than 30 post loads a minute from one address.
- `npm run check`, `npm run lint` and `npm test` pass.

---

## Phase 2: one shared settings definition

### Goal

A single description of every saved option, used by the editor now and by the
server in phase 4, so bad or hostile values are rejected in one place.

### Work

1. Move the saved options out of `SAVED_OPTIONS` in `src/lib/editor.svelte.ts`
   into `src/lib/settings.ts`. Each entry gives the option's kind and what it
   allows:
   - booleans
   - numbers with a minimum and maximum (e.g. `xReplyCount` 1 to 20)
   - one of a fixed list (e.g. `theme`, `dateFormat`, `framePreset`)
   - `frameColor`: a 3- or 6-digit hex colour, or exactly one of the gradients
     in `FRAME_SWATCHES`. Anything else, such as `url(...)`, is rejected, because
     it would make every viewer's browser load a remote image.
2. One `parseSettings(unknown)` that keeps valid options and drops the rest, so a
   single bad value never throws away the whole save.
3. Add a `version` number to what is saved, and an upgrade step for older saves,
   so options can be renamed later without losing anyone's defaults.
4. `loadDefaults` and `saveDefaults` use the new definition. Behaviour for
   visitors stays the same.
5. Tests: every option type, out-of-range numbers, unknown keys, hostile
   `frameColor` values, and an old unversioned save.

### Done when

The editor reads and writes defaults through `parseSettings`, and the tests
cover each kind of option.

---

## Phase 3: passkey accounts

### Goal

A visitor can make an account with a passkey, sign in on another device, and
recover the account with a recovery code, without giving an email address.

### Data (D1)

Better Auth's own tables (`user`, `session`, `account`, `verification`,
`passkey`), plus:

```sql
CREATE TABLE recovery_code (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at INTEGER
);

CREATE TABLE settings (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  data TEXT NOT NULL,          -- JSON, checked by parseSettings
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Migrations live in `migrations/` and run with `wrangler d1 migrations apply`.

### Work

1. **Setup.** Add the D1 binding to `wrangler.jsonc`, add Better Auth, and mount
   its handler at `/api/auth/[...all]`. Read the session in Astro middleware so
   pages and API routes can check it.
2. **Verify passkey-only accounts first.** Better Auth's passkey plugin is built
   to add a passkey to an account that already exists. The expected route is to
   make an anonymous user and attach the passkey in the same step. Prove this
   works with the current versions of Better Auth and its D1 support before
   building the rest. If it does not, fall back to SimpleWebAuthn with our own
   sessions.
3. **Making an account.** "Sync with a passkey" → the browser makes a passkey →
   the account is created → 10 recovery codes are shown once, with Copy and
   Download buttons and a "I've saved these" check before continuing.
4. **Recovery codes.** Our own code, not part of Better Auth. Codes are random,
   shown once, and stored only as hashes. Using one marks it used and lets the
   visitor add a new passkey. The account menu can make a fresh set, which
   cancels the old one.
5. **Signing in** on another device uses the browser's passkey prompt, including
   phone-as-a-key with a QR code on desktop.
6. **Account menu** (header, when signed in): sign out, add another passkey,
   list and remove passkeys, make new recovery codes, export settings as JSON,
   delete the account (removes everything, straight away).
7. **Security.**
   - Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`.
   - Astro's origin check on every request that changes data.
   - Rate limits (Workers rate-limiting binding) on sign-in, account creation
     and recovery-code attempts.
   - Passkey `rpID` is `threadshot.app`. The `*.workers.dev` preview needs its
     own `rpID`, so passkeys made there will not work in production.
8. **Privacy page** says what is stored (a random user id, passkey public keys,
   hashed recovery codes, settings), what is not, and how to delete it.

### Done when

On two different browsers, a visitor can make an account on one, sign in on
the other, use a recovery code after removing their passkeys, and delete the
account.

---

## Phase 4: syncing the saved defaults

### Goal

Signed-in visitors get the same defaults on every device.

### Work

1. **API.** `GET /api/settings` returns the account's defaults.
   `PUT /api/settings` checks the body with `parseSettings`, rejects anything
   over a few kilobytes, and stores it with `updated_at`. Both need a session.
2. **On sign-in:**
   - Account has no settings yet → upload this browser's.
   - Account has settings → use them, and show "Using your account's settings.
     Keep this browser's instead?" for one tap.
3. **Save as default** writes to local storage and the account. The button says
   where it saved, and says so plainly if only the local save worked.
4. **On load,** apply local storage straight away (no flash), then apply the
   account's copy once it arrives if it is newer.
5. **Signed out,** nothing changes from today.

### Done when

Saving defaults on one device and reloading on another shows them, and the
first sign-in with existing local defaults behaves as above.

---

## Later

- Named presets ("Instagram, dark, blurred") synced to the account. Kept out of
  the first version by choice.
- Sign in with Reddit, using the visitor's token to load threads instead of
  their own key.

## Risks

- **Phase 1 is the riskiest step.** Workers limits CPU time per request, and
  `/api/x` and `/api/img` do the heaviest work. Test them with large posts and
  pictures before cutting over.
- **Better Auth on D1 with passkey-only accounts** must be checked against
  current versions at the start of phase 3.
- **Passkeys are tied to the domain.** Changing domain later would break every
  passkey, so they are only made on `threadshot.app`.
