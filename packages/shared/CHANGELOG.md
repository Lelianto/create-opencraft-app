# @antihero/shared

## 0.3.0

### Minor Changes

- Fix two security bugs in the registry modules and add regression tests that keep them fixed.

  Anyone on 0.2.x who installed `role-permission` or `audit-log` should upgrade.

  **Fixed — `role-permission` granted a role to anonymous users.** `getRole(null)`
  returned `"member"`, so `hasRole(null, "member")` evaluated true and any
  member-level guard passed for a signed-out caller. `getRole` now returns
  `Role | null` and every check denies when there is no role.

  **Fixed — `role-permission`'s admin check could never succeed, and the obvious fix
  was a privilege-escalation trap.** It read `role` off `AppUser` via a cast, but that
  field does not exist and the auth module never sets it, so `isAdmin()` was
  permanently false. The natural place to add it — Supabase `user_metadata` — is
  rewritable by the user through `auth.updateUser()`, so following that instinct would
  let anyone grant themselves admin. The module now documents that roles must come
  from `app_metadata`, a service-role-protected table, or Firebase custom claims.

  **Fixed — `audit-log` logged four of its own sensitive keys in the clear.** The
  redaction set held camelCase entries (`apiKey`, `privateKey`, `accessToken`,
  `refreshToken`) while the lookup lower-cased the incoming key, so those never
  matched. Keys are now normalised on both sides, with a pattern fallback for compound
  names such as `stripeApiKey`.

  **Fixed — `search-filter` did not work with `crud-example`.** It wrote `?q=` while
  the server list schema reads `?search=`, so installing both silently did nothing. It
  also listed `searchParams` as an effect dependency while calling `router.replace`,
  retriggering itself. It now defaults to `search` and resets `page` on a new query.

  **Fixed — `user-profile` turned any error into a redirect,** hiding misconfiguration
  such as a missing environment variable behind a bounce to `/`.

  **Changed — `data-table` and `pagination`** are rebuilt on the vendored shadcn
  primitives with theme tokens instead of hardcoded colours, so they work in dark mode.
  `data-table` gains loading and empty states. The shadcn `avatar` primitive is now
  vendored, as `user-profile` requires it.

  **Added — security regression tests.** Registry templates are copied into generated
  projects and were never executed here, so template bugs were invisible to CI. The
  tests now import the real template sources and assert the invariants directly, plus
  structural checks across every template: no identity from a request header, every
  mutating route handler calls `requireUser()`, no role from writable metadata, no
  browser-reported MIME trusted, and security headers actually wired into
  `next.config.ts`. Each check was mutation-tested — the original bug was reintroduced
  to confirm the test fails — which caught one assertion that was too weak to detect
  its own bug.

  Breaking within the registry: `getRole()` returns `Role | null`, `writeAuditLog()`
  dropped its unused second parameter, and `search-filter`'s default query parameter
  is now `search`.

### Patch Changes

- Updated dependencies
  - @antihero/config@0.3.0

## 0.2.1

### Patch Changes

- fix: publish with resolved workspace dependency versions instead of raw `workspace:*` protocol, which npm cannot install
- Updated dependencies
  - @antihero/config@0.2.1

## 0.2.0

### Minor Changes

- Repair critical defects in the CLI and generated code, and move the template to Next.js 16.

  This is a minor bump rather than a patch because it contains breaking changes, and
  0.1.1 should be treated as unusable.

  **Fixed — the CLI was completely non-functional.** `bin.ts` resolved its version
  from a path that does not exist in the published package, and because that ran while
  constructing the Command instance it threw at import time. Every command — `init`,
  `add`, `list`, `info`, `doctor`, `diff`, `update`, `remove` — crashed before
  dispatching. A test that executes the compiled binary now guards this.

  **Fixed — generated API routes accepted a forged identity.** The crud-example,
  image-upload and file-upload templates read the caller's identity from an
  `x-authenticated-user` request header that nothing ever set, so any client could
  impersonate any user and read or write their records. All three now verify the
  session server-side via `requireUser()`. file-upload additionally stopped trusting
  the browser-reported MIME type when magic-byte detection returned nothing.

  **Fixed — security headers were generated but never applied.** `next.config.ts` was
  an empty object, so no CSP, HSTS, or nosniff was ever sent.

  **Changed — Next.js 16.** `middleware.ts` becomes `proxy.ts`, `cookies()` is
  awaited, and Route Handler `params` is a Promise. All dependencies were refreshed to
  verified-current versions.

  **Breaking:** `image-upload`, `file-upload` and `crud-example` now require an
  authentication backend, since uploads and records are attributed to a user.
  `security-headers` is repurposed as the opt-in strict nonce CSP because the baseline
  headers now ship in the template. `crud-example` persists through Supabase or
  Firestore with ownership enforcement instead of an in-memory array.

### Patch Changes

- Updated dependencies
  - @antihero/config@0.2.0
