# create-opencraft-app

![npm](https://img.shields.io/npm/v/create-opencraft-app?color=cb3837) ![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg) ![Node](https://img.shields.io/badge/node-%3E%3D20.9-339933) ![Modules](https://img.shields.io/badge/modules-27-6366f1)

**The official scaffolding tool for OpenCraft — a modular, security-first Next.js application generator.**

Create a production-ready Next.js app in one command: App Router, TypeScript strict, Tailwind CSS, shadcn/ui, server-side authentication, storage adapters, security hardening, deployment config, and a Living Context for AI agents — all pre-wired and tested.

Next.js App Router • TypeScript Strict • Tailwind CSS • shadcn/ui • Zod Validation • Security-First Architecture

---

## Table of Contents

- [■ What is create-opencraft-app?](#what-is-create-opencraft-app)
- [☰ Quick Start](#quick-start)
- [⊞ Product Presets](#product-presets)
- [▤ Command Reference](#command-reference)
- [🧩 What Gets Generated](#what-gets-generated)
- [🗺 Modules Matrix](#modules-matrix)
- [🤖 AI & Agent Integration](#ai--agent-integration)
- [🛡 Security by Default](#security-by-default)
- [↻ In-Project Management CLI](#in-project-management-cli-opencraft)
- [⚙ Environment Setup](#environment-setup)
- [✎ Frequently Asked Questions](#frequently-asked-questions)
- [♥ Contributing](#contributing)
- [⚖ License](#license)

---

## What is create-opencraft-app?

OpenCraft is built on a **shadcn-style philosophy**: every generated file is added directly into
_your_ repository, owned by you, and tracked by checksum. Instead of a monolithic boilerplate, it
ships a small set of versioned, security-reviewed **modules** — authentication, storage, uploads,
CRUD, roles, rate limiting, SSRF protection, deployment — that compose into the exact product you
need.

The result: developers _and_ AI coding agents start from a working, secure, deployable product
instead of a blank template — and only write the business logic that is actually theirs.

This package is one half of a two-part system. The other half is
[`opencraft-skills`](https://www.npmjs.com/package/opencraft-skills), which every generated project
requires to install a shared Agent Skills workflow and a **Living Context** (`.lcdd/`) — versioned,
machine-readable project knowledge governed by **Living Context Driven Development (LCDD)**.

---

## Quick Start

### Interactive scaffolding

```bash
npx create-opencraft-app my-app
```

You will be guided through the component architecture, backend provider, authentication, storage
adapter, and initial modules:

```text
◇ Project name? my-app
◇ Package manager? pnpm
◇ Component architecture?
  Feature-based
  Atomic Design
  ● Hybrid (Recommended)

◇ Backend provider?
  None
  ● Supabase
  Firebase

◇ Authentication?
  None
  ● Google

◇ Storage provider?
  None
  ● Vercel Blob
  Supabase Storage
  Firebase Storage

◇ Select initial modules?
  [x] Dashboard
  [x] Input validation
  [x] Confirmation dialog
  [x] Image upload
  [x] CRUD example

◇ Initialize Git repository? Yes
◇ Install dependencies? Yes
```

### From a product preset

```bash
npx create-opencraft-app my-app --preset saas
npx create-opencraft-app my-app --preset list
```

### Non-interactive (CI / automation)

```bash
npx create-opencraft-app my-app \
  --architecture hybrid \
  --backend supabase \
  --auth google \
  --storage vercel-blob \
  --modules dashboard,image-upload,crud-example \
  --package-manager pnpm \
  --yes
```

---

## Product Presets

A preset is a validated combination of architecture + backend + auth + storage + modules that is
**built and tested in CI**, so a preset project is deployable from the first run. Explicit flags
always override preset defaults.

| Preset           | Architecture | Backend  | Auth   | Storage     | Purpose                                                                                                                         |
| ---------------- | ------------ | -------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `saas`           | hybrid       | supabase | google | supabase    | Full SaaS: auth, dashboard, roles, profiles, audited CRUD, search, pagination, rate limiting, security hardening, Vercel deploy |
| `firebase-saas`  | hybrid       | firebase | google | firebase    | Same SaaS on Firebase                                                                                                           |
| `admin-tool`     | hybrid       | supabase | google | supabase    | Internal backoffice / admin console                                                                                             |
| `app-mobile-api` | feature      | firebase | google | firebase    | Mobile app backend + web admin                                                                                                  |
| `self-hosted`    | hybrid       | supabase | google | supabase    | Full SaaS packaged for self-hosting (Docker standalone + compose)                                                               |
| `content`        | atomic       | none     | none   | vercel-blob | Landing + static dashboard                                                                                                      |
| `blog`           | atomic       | none     | none   | none        | Blog shell                                                                                                                      |
| `portfolio`      | atomic       | none     | none   | none        | Personal / business site                                                                                                        |

---

## Command Reference

| Option              | Values                                                                                                         | Description                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `--preset <name>`   | `saas`, `firebase-saas`, `admin-tool`, `app-mobile-api`, `self-hosted`, `content`, `blog`, `portfolio`, `list` | Start from a validated product preset (`list` shows all)      |
| `--architecture`    | `hybrid`, `feature`, `atomic`                                                                                  | Component architecture layout                                 |
| `--backend`         | `none`, `supabase`, `firebase`                                                                                 | Backend provider                                              |
| `--auth`            | `none`, `google`                                                                                               | Google OAuth authentication                                   |
| `--storage`         | `none`, `vercel-blob`, `supabase`, `firebase`                                                                  | Storage adapter                                               |
| `--modules`         | comma-separated list                                                                                           | Initial modules to install                                    |
| `--package-manager` | `pnpm`, `npm`, `yarn`, `bun`                                                                                   | Target package manager                                        |
| `--dry-run`         | flag                                                                                                           | Preview the generated file structure without writing anything |
| `--yes`             | flag                                                                                                           | Skip prompts and accept defaults                              |
| `--no-install`      | flag                                                                                                           | Skip automatic dependency installation                        |
| `--no-git`          | flag                                                                                                           | Skip `git init`                                               |
| `--help`            | flag                                                                                                           | Show CLI help                                                 |
| `--version`         | flag                                                                                                           | Show the CLI version                                          |

---

## What Gets Generated

1. **Next.js App Router setup** — TypeScript strict, Tailwind CSS v4, shadcn/ui primitives,
   ESLint flat config, `output: "standalone"` for easy deployment.
2. **App shell** — responsive `SiteHeader`, `SiteFooter`, `ThemeProvider` (next-themes) with a
   dark-mode toggle, and a landing page (hero, features, CTA).
3. **Selected component architecture** — directory structures for `hybrid`, `feature`, or
   `atomic` layouts, enforced by the module registry.
4. **Selected provider adapters** — Supabase or Firebase Auth & Storage in `src/infrastructure/`,
   behind unified contracts.
5. **Initial modules** — pre-configured features (e.g. `image-upload`, `crud-example`,
   `dashboard`, `ssrf-protection`) with dependencies resolved transitively.
6. **`opencraft.config.json`** — tracks installed module versions and per-file checksums.
7. **`AGENTS.md` + Living Context** — machine-readable rules for AI assistants, plus `.lcdd/`
   (Context Registry) materialized by `opencraft-skills` on `pnpm install`.
8. **`opencraft-skills` dependency** — a `postinstall` step installs the Agent Skills and
   bootstraps the baseline `core-pack`, so every compatible agent shares the same workflow.

---

## Modules Matrix

OpenCraft ships 27 production-ready, security-reviewed modules. A module is a versioned bundle of
templates + dependencies + env vars + instructions; the registry resolves dependencies, checks
checksums, and never silently overwrites your edits.

| Category        | Module                | Description                                             |
| --------------- | --------------------- | ------------------------------------------------------- |
| **Core**        | `input-validation`    | Centralized Zod schema validation helpers               |
|                 | `api-response`        | Typed API response formatters                           |
|                 | `error-handling`      | Typed `AppError`, error boundary, secure error mapping  |
|                 | `confirmation-dialog` | Accessible destructive-action confirmation dialog       |
|                 | `security-headers`    | Strict nonce-based CSP upgrade                          |
|                 | `rate-limit`          | Provider-neutral rate-limit contract + dev adapter      |
|                 | `ssrf-protection`     | DNS-aware, bounded outbound HTTPS (`safeFetch`)         |
| **Auth**        | `auth-supabase`       | Supabase Auth provider implementation                   |
|                 | `auth-firebase`       | Firebase Auth & Admin SDK server verification           |
|                 | `google-auth`         | Google OAuth sign-in UI per provider                    |
|                 | `auth-pages`          | Working sign-in page (`/auth/signin`) + sign-out button |
|                 | `protected-routes`    | Next.js 16 `proxy.ts` + server-side route protection    |
|                 | `role-permission`     | RBAC role hierarchy + ownership checks                  |
| **Storage**     | `storage-vercel-blob` | Vercel Blob storage adapter                             |
|                 | `storage-supabase`    | Supabase Storage adapter (private-by-default)           |
|                 | `storage-firebase`    | Firebase Cloud Storage adapter                          |
|                 | `file-upload`         | Magic-byte validated, rate-limited file upload          |
|                 | `image-upload`        | WebP compression pipeline                               |
| **Application** | `dashboard`           | Responsive dashboard shell                              |
|                 | `data-table`          | Typed, server-rendered data table                       |
|                 | `pagination`          | URL-driven pagination                                   |
|                 | `search-filter`       | Debounced URL query-bound search                        |
|                 | `user-profile`        | Authenticated profile page                              |
|                 | `audit-log`           | Secret-redacting audit logger                           |
|                 | `crud-example`        | End-to-end CRUD pattern reference (Entity: `Product`)   |
| **Deployment**  | `deploy-docker`       | Standalone Dockerfile, `.dockerignore`, `compose.yaml`  |
|                 | `deploy-vercel`       | `vercel.json` + PR preview workflow                     |

---

## AI & Agent Integration

Every generated project includes a dynamically populated `AGENTS.md` that records the
architecture, where code belongs, the security rules, the installed modules, and the exact
verification commands. It also ships a machine-readable module contract:

```bash
opencraft list --json        # every module: resolved exports, lifecycle, status
opencraft info role-permission  # one module's public API + governance + files
```

Each module exposes `exports` (its public API) and `governance` (owner, classification,
lifecycle), so AI agents can import from an installed module's public surface without reading its
implementation — and never re-implement infrastructure.

`opencraft-skills` then installs a shared delivery workflow into `.claude/skills`, `.cursor/skills`,
`.codex/skills`, `.github/skills`, and `.agents/skills`, and materializes a Living Context
Registry into `.lcdd/` — governed by LCDD, versioned in git.

---

## Security by Default

OpenCraft is honest about what it does and does not protect. Every claim below is implemented in
generated code and covered by mutation-tested behavioural tests.

| Concern              | How it is handled                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication       | `requireUser()` verifies the session **server-side** on every request (Supabase `auth.getUser()`; Firebase `verifySessionCookie(token, true)`). |
| Authorization / IDOR | Every repository query is scoped by `ownerId`; another user's record returns `404`, not `403`.                                                  |
| Input validation     | Zod on the server for body, query, and route params; `.strict()` blocks mass assignment.                                                        |
| SQL injection        | Supabase query builder / parameterised RPC only. No string-concatenated SQL.                                                                    |
| NoSQL abuse          | Collection names are constants; sort fields resolve through an allowlist.                                                                       |
| Upload safety        | Magic-byte sniffing, MIME allowlist, size/pixel ceilings, WebP re-encode, randomised keys, per-user rate limits, SVG rejected.                  |
| Security headers     | `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, CSP with `frame-ancestors 'none'`.                                                    |
| SSRF                 | `safeFetch()` enforces protocol/hostname allowlists and blocks private/loopback/link-local/CGNAT ranges.                                        |
| Secrets              | `.env.example` contains names only; `logError()` never emits tokens, cookies, or bodies.                                                        |

---

## In-Project Management CLI (`opencraft`)

Once your project is generated, use the `opencraft` CLI (shipped as `@antihero/cli`) inside your
application directory:

```bash
opencraft add <module>       # install a module (installs dependencies transitively)
opencraft list               # installed vs available modules
opencraft list --json        # machine-readable: exports, lifecycle, status
opencraft info <module>      # public API contract, governance, files, env vars
opencraft doctor             # diagnose config, missing files, and env requirements
opencraft diff <module>      # unified diff of local vs registry
opencraft update <module>    # re-apply an unmodified module's registry files
opencraft remove <module>    # remove a module's unmodified files
```

`update` and `remove` are deliberately conservative: they refuse to touch files you have
customised, and `remove` refuses when another module depends on the target.

---

## Environment Setup

Secrets live in `.env.local` (git-ignored). `.env.example` is committed and contains variable
**names only** — modules append to it as you install them.

```bash
cp .env.example .env.local
# then fill in the values
```

`opencraft doctor` reports which required variables are missing — it prints names and
availability only, never values.

| Provider    | Variables                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Supabase    | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`                                    |
| Firebase    | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, plus the `NEXT_PUBLIC_FIREBASE_*` client keys |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN`                                                                                               |

---

## Frequently Asked Questions

**Do I need `opencraft-skills`?**
Yes — it is a required dependency of every generated project. Its `postinstall` step installs the
Agent Skills and materializes the Living Context (`.lcdd/`), so agents and humans stay on the same,
current page.

**Is generated code mine?**
Yes. Every file is copied into your repository and tracked by checksum. OpenCraft never silently
overwrites an edit you made.

**Can I run this offline or in CI?**
Yes — every flag has a non-interactive form and `--dry-run` previews without writing.

**Do I need an npm account to scaffold?**
No. `npx create-opencraft-app` downloads the CLI and runs locally.

---

## Contributing

Contributions of all kinds are welcome — new modules, security reviews, documentation, and
critique. See [CONTRIBUTING.md](https://github.com/Lelianto/create-opencraft-app/blob/main/CONTRIBUTING.md)
in the monorepo. In short: add a module under `registry/modules/<name>/`, run
`pnpm run registry:validate`, and add a test.

---

## License

[MIT](https://github.com/Lelianto/create-opencraft-app/blob/main/LICENSE)
