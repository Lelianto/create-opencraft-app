# @antihero/shared

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
