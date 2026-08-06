---
"create-opencraft-app": minor
"@antihero/cli": minor
"@antihero/registry": minor
---

feat: ship validated product presets, an app shell with dark mode, and require opencraft-skills in every generated project

- Add `registry/presets/*.json` (`saas`, `content`, `app-mobile-api`, `blog`) with a Zod-validated `presetSchema` and `loadPresets`/`loadPreset` loaders in `@antihero/registry`.
- Add `create --preset <name>` and `--preset list` to `create-opencraft-app`; a preset pins architecture/backend/auth/storage/modules while explicit flags still win.
- Give the `nextjs-base` template an app shell: `SiteHeader`, `SiteFooter`, `ThemeProvider` (next-themes) and a dark-mode toggle, plus a richer landing page (hero, features, CTA).
- Require `opencraft-skills@1.2.0` in every generated project via a `postinstall` script so Agent Skills are installed on `pnpm install`.
- Add three more presets: `firebase-saas`, `admin-tool`, and `portfolio`, bringing the total to seven named presets.
- Expand the `generated-apps` CI matrix to cover atomic, feature, backend-less, storage-supabase, and the full `saas` preset, so every architecture and every preset is really built.
- Add behavioural template tests for `rate-limit`, the strict CSP nonce, `safeFetch` SSRF defences, the Supabase crud repository, and structural validation of `products.sql` RLS + `firestore.rules`.
- Add `registry/schemas/module.schema.json`, the JSON Schema referenced by `CONTRIBUTING.md` that was previously missing.
