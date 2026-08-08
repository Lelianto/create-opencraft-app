# OpenCraft

<p align="center">
  <a href="https://www.npmjs.com/package/create-opencraft-app"><img src="https://img.shields.io/npm/v/create-opencraft-app?color=cb3837" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e.svg" alt="License: MIT" /></a>
  <a href="registry/modules"><img src="https://img.shields.io/badge/modules-27-6366f1" alt="Modules" /></a>
  <a href="https://github.com/Lelianto/create-opencraft-app/actions/workflows/ci.yml"><img src="https://github.com/Lelianto/create-opencraft-app/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

**Production-ready, modular Next.js project generator.** Install once, ship a secure, deployable product — never rewrite authentication, storage, validation, or security rules again.

Next.js App Router • TypeScript Strict • Tailwind CSS • shadcn/ui • Zod Validation • Security-First Architecture • Agent-ready contracts

---

## Table of Contents

- [■ What is OpenCraft?](#what-is-opencraft)
- [▶ The Problem](#the-problem)
- [◈ The OpenCraft Way](#the-opencraft-way)
- [☰ Quick Start](#quick-start)
- [⊞ Product Presets](#product-presets)
- [▤ CLI Reference](#cli-reference)
- [↻ Component Architectures](#component-architectures)
- [🧩 Modules Matrix](#modules-matrix)
- [⇔ Machine-Readable Module Contracts](#machine-readable-module-contracts)
- [🤖 AI & Agent Integration](#ai--agent-integration)
- [◈ opencraft-skills & LCDD](#opencraft-skills--lcdd)
- [🛡 Security Model](#security-model)
- [⚙ Environment Setup](#environment-setup)
- [⟳ Update & Conflict Handling](#update--conflict-handling)
- [🚀 Deployment](#deployment)
- [◈ Monorepo Layout & Local Development](#monorepo-layout--local-development)
- [☗ Publishing to npm](#publishing-to-npm)
- [⊞ Roadmap](#roadmap)
- [♥ Contributing](#contributing)
- [⚖ License](#license)

---

## What is OpenCraft?

OpenCraft is an open-source, modular project generator and CLI engine for **Next.js**, built on a
**shadcn-style philosophy**: every generated file is added directly into _your_ repository, owned by
you, tracked by checksum. Instead of a monolithic boilerplate, OpenCraft ships a small set of
versioned, security-reviewed **modules** — authentication, storage, uploads, CRUD, roles, rate
limiting, SSRF protection, deployment — that compose into the exact product you need.

The result: developers _and_ AI coding agents start from a working, secure, deployable product
instead of a blank template, and only write the business logic that is actually theirs.

OpenCraft is built on two companion open-source projects:

- **[`opencraft-skills`](https://github.com/Lelianto/opencraft-skills)** — _Portable Agent Skills &
  Living Context._ It provides 18 portable agent skills (from product analysis to authorized
  deployment) and Context Packs — installable, versioned bundles of project knowledge. OpenCraft
  requires it in every generated project, so agents and humans work from the same, current context.
- **[Living Context Driven Development (LCDD)](https://github.com/Lelianto/living-context-driven-development)**
  — _The governing methodology._ The discipline that context is versioned, governed, enforced, and
  evolved. OpenCraft follows it: every generated project ships a versioned **Living Context**
  (`.lcdd/`), and every module carries **governance** metadata answering _who owns this, why, and
  how it changes_.

> **What they do for OpenCraft:** opencraft-skills installs the delivery workflow and materializes
> the LCDD Context Registry (`.lcdd/`) into every generated project; LCDD defines _why_ that
> registry exists and _how_ it is governed. Skills provide the _how to work_; LCDD provides the
> _what is known and enforced_. Together they make OpenCraft's promise — "AI never guesses the
> architecture or security rules" — machine-enforceable instead of hope-based.

## The Problem

Most teams rebuild the same foundation for every new project:

1. Ask an AI to generate base code (config, layout, styling, folders, providers).
2. Ask it to generate components and pages (auth, dashboard, CRUD, upload).
3. Ask it to wire a backend (session, ownership, RLS/Firestore rules, storage, rate limits).
4. Ask it to set up deployment (env, config, migration, CI/CD).

Each cycle burns tens of thousands of tokens on code that is ~90% identical to the last project —
and the AI often gets security, ownership, and provider SDKs subtly wrong, because it has no tested
context. The invisible cost is every build running on context nobody verified.

## The OpenCraft Way

1. **Install & done over generate-and-pray.** A tested, secure foundation is _installed_ — not
   re-generated — so the AI only writes business logic.
2. **Machine-readable over human-only.** Modules expose a public API contract (`exports`) and
   governance metadata, so agents consume verified interfaces instead of guessing.
3. **Evidence over claims.** Every claim in this README is implemented in generated code and
   covered by mutation-tested behavioural tests. Limitations are documented, not papered over.
4. **Human authority.** Production deployment and destructive operations stay explicit, separated
   actions. Generated code is _your_ code — OpenCraft never silently overwrites an edit you made.
5. **Reusable over rewritten.** Generic project knowledge and infrastructure are versioned,
   shared, and installed — never re-authored per project.
6. **Composition over monolith.** One combination = one validated preset. No giant template that
   drags in 30 integrations you will never use.

---

## Quick Start

### Create a new application

```bash
npx create-opencraft-app my-app
```

#### Interactive selection flow

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

#### Non-interactive scaffolding

For automated setups and CI:

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

Or start from a validated product preset:

```bash
npx create-opencraft-app my-app --preset saas
npx create-opencraft-app my-app --preset self-hosted
npx create-opencraft-app --preset list
```

---

## Product Presets

A preset is a validated combination of architecture + backend + auth + storage + modules that is
**built and tested in CI**, so a preset project is deployable from the first run. Explicit flags
always win over preset defaults.

| Preset           | Architecture | Backend  | Auth   | Storage     | Purpose                                                                                                                                  |
| ---------------- | ------------ | -------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `saas`           | hybrid       | supabase | google | supabase    | Full SaaS app: auth, dashboard, roles, user profiles, audited CRUD, search, pagination, rate limiting, security hardening, Vercel deploy |
| `firebase-saas`  | hybrid       | firebase | google | firebase    | Same SaaS on Firebase                                                                                                                    |
| `admin-tool`     | hybrid       | supabase | google | supabase    | Internal backoffice / admin console                                                                                                      |
| `app-mobile-api` | feature      | firebase | google | firebase    | Mobile app backend + web admin                                                                                                           |
| `self-hosted`    | hybrid       | supabase | google | supabase    | Full SaaS packaged for self-hosting (Docker standalone + compose)                                                                        |
| `content`        | atomic       | none     | none   | vercel-blob | Landing + static dashboard                                                                                                               |
| `blog`           | atomic       | none     | none   | none        | Blog shell                                                                                                                               |
| `portfolio`      | atomic       | none     | none   | none        | Personal / business site                                                                                                                 |

---

## CLI Reference

### Scaffolding CLI — `create-opencraft-app`

| Option              | Values                                                                                                         | Description                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `--preset <name>`   | `saas`, `firebase-saas`, `admin-tool`, `app-mobile-api`, `self-hosted`, `content`, `blog`, `portfolio`, `list` | Start from a validated product preset                |
| `--architecture`    | `hybrid`, `feature`, `atomic`                                                                                  | Component architecture layout                        |
| `--backend`         | `none`, `supabase`, `firebase`                                                                                 | Backend provider                                     |
| `--auth`            | `none`, `google`                                                                                               | Google OAuth authentication                          |
| `--storage`         | `none`, `vercel-blob`, `supabase`, `firebase`                                                                  | Storage adapter                                      |
| `--modules`         | comma-separated list                                                                                           | Initial modules to install                           |
| `--package-manager` | `pnpm`, `npm`, `yarn`, `bun`                                                                                   | Target package manager                               |
| `--dry-run`         | flag                                                                                                           | Preview the generated file structure without writing |
| `--yes`             | flag                                                                                                           | Skip prompts and accept defaults                     |
| `--no-install`      | flag                                                                                                           | Skip automatic dependency installation               |
| `--no-git`          | flag                                                                                                           | Skip `git init`                                      |

### In-project management CLI — `opencraft`

```bash
opencraft add <module>       # install a module (installs dependencies transitively)
opencraft list               # installed vs available modules
opencraft list --json        # machine-readable: exports, lifecycle, status (for AI agents)
opencraft info <module>      # public API contract, governance, files, env vars
opencraft doctor             # diagnose config, missing files, and env requirements
opencraft diff <module>      # unified diff of local vs registry
opencraft update <module>    # re-apply an unmodified module's registry files
opencraft remove <module>    # remove a module's unmodified files (refuses when depended on)
```

---

## Component Architectures

OpenCraft supports three clear component layouts. The choice is recorded in
`opencraft.config.json` and enforced by the module registry — files land where the architecture
says they belong.

### 1. Hybrid (default & recommended)

Combines atomic presentational components with domain-driven business features:

```text
src/
├── app/                      # Next.js App Router pages & API routes
├── components/
│   ├── ui/                   # Primitive shadcn/ui components
│   ├── atoms/                # Fundamental UI primitives
│   ├── molecules/            # Combinations of UI primitives
│   ├── organisms/            # Reusable UI sections
│   └── layouts/              # Shared layout structures
├── features/
│   ├── authentication/       # Business logic, hooks, schemas, API calls
│   ├── products/
│   └── users/
├── infrastructure/           # Auth & storage provider adapters
├── config/                   # App constants & env schemas
├── lib/                      # Utilities & shared helpers
└── types/                    # Global TypeScript declarations
```

### 2. Feature-Based

Domain-driven layout where features encapsulate logic and expose clean public exports:

```text
src/
├── app/
├── components/
│   └── ui/                   # Primitive shadcn components
├── features/
│   ├── authentication/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts          # Public export interface for other features
│   ├── products/
│   └── users/
├── infrastructure/
├── config/
├── lib/
└── types/
```

### 3. Atomic Design

Structured layout for presentational clarity:

```text
src/
├── app/
├── components/
│   ├── ui/                   # Original shadcn components
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   ├── templates/
│   └── layouts/
├── infrastructure/
├── config/
├── lib/
└── types/
```

---

## Modules Matrix

OpenCraft ships 27 production-ready, security-reviewed modules. A module is a versioned bundle of
templates + dependencies + env vars + instructions; the registry resolves dependencies, checks
checksums, and refuses to overwrite your edits.

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

## Machine-Readable Module Contracts

Every module ships two machine-readable contracts so AI agents (and humans) can use a module's
public surface without reading its implementation — and never re-implement infrastructure.

### `exports` — the public API contract

```json
{
  "name": "role-permission",
  "exports": [
    {
      "name": "getRole",
      "path": "{{aliases.lib}}/roles.ts",
      "description": "Resolve role from user"
    },
    {
      "name": "requireRole",
      "path": "{{aliases.lib}}/roles.ts",
      "description": "Role enforcement"
    },
    {
      "name": "requireOwnerOrAdmin",
      "path": "{{aliases.lib}}/roles.ts",
      "description": "Ownership or admin enforcement"
    }
  ]
}
```

Inside a generated project, placeholders are resolved to real paths:

```bash
opencraft list --json        # every module: resolved exports, lifecycle, status
opencraft info role-permission  # one module's public API + governance + files
```

### `governance` — ownership & lifecycle

```json
{
  "governance": {
    "owner": "opencraft-security",
    "classification": "security",
    "lifecycle": "stable",
    "reviewCadence": "quarterly"
  }
}
```

`pnpm run registry:validate` enforces that every export points to a file the module actually
installs, and that governance metadata is well-formed — so the registry can answer _who owns this
rule, why, and how it changes_.

---

## AI & Agent Integration

### Generated `AGENTS.md`

Every generated project includes a dynamically populated `AGENTS.md` that records the architecture,
where code belongs, security rules, the installed modules, and the exact verification commands. Any
agent (or human) editing the project must read it first:

```markdown
# AGENTS.md

Stack: Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui.
Architecture: hybrid. Backend: supabase. Authentication: supabase (google). Storage: vercel-blob.

- Keep shadcn primitives in src/components/ui.
- Place business-specific code inside src/features and export cross-feature APIs through index.ts.
- Put provider SDKs in src/infrastructure and use installed adapters.
- Build Route Handlers only under src/app/api/**/route.ts.
- Validate every external input on the server with Zod; client validation is only UX.
- Never trust client-side authorization. Verify authentication, role, and resource ownership server-side.
- Never concatenate user input into SQL or accept arbitrary Firestore collection, field, or operators.
- Validate upload signature, MIME, size, dimensions, filename/key, and authorization; reject SVG by default.
- Reuse installed modules before creating abstractions. Do not change architecture without approval.
- Installed modules: dashboard, image-upload, crud-example.
- Each module exposes a machine-readable public API: run `opencraft list --json` to see exports, then import from those paths.
```

### Living Context (LCDD) via opencraft-skills

Every generated project requires [`opencraft-skills`](https://github.com/Lelianto/opencraft-skills).
Its `postinstall` step does two things:

1. Installs the portable Agent Skills into `.claude/skills`, `.cursor/skills`, `.codex/skills`,
   `.github/skills`, and `.agents/skills`, so compatible agents share the same delivery workflow.
2. Applies **Living Context**: bootstraps the baseline `core-pack` and materializes a Context
   Registry into `.lcdd/` (contexts, project knowledge, merged AI rules) plus a `packs.yaml`
   declaration file.

The baseline pack enforces the project's non-negotiables: the **evidence standard**, **secrets
protection**, **production authority**, and **honest claims**. Extend the living context by
declaring more packs and re-materializing:

```bash
npx opencraft-packs packs add nextjs-pack --project .
npx opencraft-packs packs add security-pack --project .
npx opencraft-packs packs install --project .
```

`.lcdd/` is git-backed — commit it so the team and agents stay on the same, current page.

---

## opencraft-skills & LCDD

OpenCraft is one half of a two-part system. This repository generates the code; the other two
repositories govern _how it is built and what is known_.

### [`opencraft-skills`](https://github.com/Lelianto/opencraft-skills) — portable agent skills & context packs

What it is: a collection of **18 portable Agent Skills** (from `analyze-product` and
`write-product-prd` to `prepare-deployment` and `ship-web-product`) plus **14 Context Packs**
(typescript, nextjs, security, testing, fintech, healthcare, …). It ships two CLIs —
`opencraft-skills` and `opencraft-packs` — with zero runtime dependencies.

What it does for a generated OpenCraft project:

1. **Installs a shared delivery workflow** into every compatible client (`.claude/skills`,
   `.cursor/skills`, `.codex/skills`, `.github/skills`, `.agents/skills`) so Claude Code, Cursor,
   Codex, and GitHub Copilot all follow the same production-minded process.
2. **Bootstraps the baseline `core-pack`** and **materializes the LCDD Context Registry** into
   `.lcdd/` — contexts, project knowledge, merged AI rules in `.lcdd/ai/AGENTS.md`, a
   `packs.yaml` declaration file, and a version-pinned `packs.lock.json`.

### [Living Context Driven Development (LCDD)](https://github.com/Lelianto/living-context-driven-development) — the methodology

What it is: the governing methodology behind Context Packs. Its core claim: _every rule and
convention should be versioned, governed, enforced, and evolved — and machine-readable, so an AI
agent can actually consume it._

What it does for a generated OpenCraft project:

1. **Context as a versioned artifact.** `.lcdd/contexts/` is a git-backed Context Registry — every
   rule has provenance, authority, ownership, and a lifecycle.
2. **Explicit governance over implicit trust.** `.lcdd/` records _who_ owns each context and _why_
   it exists. OpenCraft mirrors this at the module level with its `governance` metadata.
3. **Machine-readable over human-only.** If an agent cannot consume a rule, it will be ignored at
   scale — so every context is materialized as structured YAML _and_ rendered into
   `.lcdd/CONTEXT.md` and `.lcdd/ai/AGENTS.md`.
4. **Evidence over claims.** The baseline `core-pack` enforces the evidence standard: completion
   claims require fresh command output, and "not run" must be recorded honestly.

**The division of labour:** `opencraft-skills` provides the _how_ — the installable skills and
packs that teach agents a shared way to work. LCDD provides the _why_ — the discipline and schema
that keep that knowledge versioned, governed, and enforced. OpenCraft is the _what_ — the generated,
tested, security-reviewed application code. Together they turn "AI never guesses the architecture
or security rules" from a hope into a machine-enforced guarantee.

---

## Security Model

OpenCraft is honest about what it does and does not protect. Every claim below is implemented in
generated code and covered by mutation-tested behavioural tests; every limitation is stated.

### Enforced by default

| Concern              | How it is handled                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication       | `requireUser()` verifies the session **server-side** on every request. Supabase uses `auth.getUser()` (revalidates the token); Firebase uses `verifySessionCookie(token, true)` (honours revocation). |
| Authorization / IDOR | Every repository query is scoped by `ownerId`; another user's record returns `404`, not `403`, so responses do not confirm existence.                                                                 |
| Input validation     | Zod on the server for body, query, and route params. `.strict()` rejects unknown keys, blocking mass assignment.                                                                                      |
| SQL injection        | All access goes through the Supabase query builder or parameterised RPC. No string-concatenated SQL.                                                                                                  |
| NoSQL abuse          | Collection names are constants; sort fields resolve through an allowlist. Raw operators, field paths, and collection names from clients are never accepted.                                           |
| Upload safety        | Magic-byte sniffing (never `file.type`), MIME allowlist, size and pixel ceilings, re-encode to WebP, randomised storage keys, per-user rate limits, SVG rejected.                                     |
| Security headers     | `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, CSP with `frame-ancestors 'none'`, applied to every response by `next.config.ts`.                                                           |
| Open redirect        | OAuth callback validates `next` against the app's own origin and rejects protocol-relative URLs.                                                                                                      |
| SSRF                 | `safeFetch()` enforces protocol/hostname allowlists, blocks private/loopback/link-local/CGNAT ranges (including IPv4-mapped IPv6), re-validates every redirect hop, and caps time and response size.  |
| Error handling       | Unknown errors collapse to a generic `INTERNAL` failure. Stack traces and provider messages are never returned to clients.                                                                            |
| Secret handling      | `.env.example` contains names only. `logError()` emits a code and short detail, never tokens, cookies, or request bodies.                                                                             |

### Stated limitations

These are real gaps, documented rather than papered over:

- **The default CSP allows `'unsafe-inline'` for scripts.** Next.js injects inline bootstrap
  scripts, so a policy without either `'unsafe-inline'` or a per-request nonce breaks the App
  Router. The default is therefore useful but is _not_ a complete XSS defence. Run
  `opencraft add security-headers` for the strict nonce-based policy — at the cost of forcing
  dynamic rendering.
- **`proxy.ts` is not an authorization boundary.** It refreshes sessions and redirects anonymous
  visitors for convenience. It can be bypassed and never sees per-resource ownership, so every
  Route Handler re-checks identity itself.
- **Rate limiting is in-memory by default.** That means per-instance. On serverless or
  multi-region deployments an attacker gets one bucket per instance. Move to Redis or Upstash
  before relying on it.
- **SSRF protection cannot fully stop DNS rebinding.** The hostname is re-resolved by `fetch`
  after validation. The hostname allowlist is the real control — keep it narrow.
- **Confirmation dialogs are UX, not security.** The server always re-authorises.
- **Provider rules are a backstop, not the control.** Supabase RLS and Firestore Rules are
  generated and should be deployed, but Admin SDK and service-role keys bypass them — which is
  why ownership is also enforced in application code.

---

## Environment Setup

Secrets live in `.env.local` (git-ignored). `.env.example` is committed and contains variable
**names only** — modules append to it as you install them.

```bash
cp .env.example .env.local
# then fill in the values
```

`opencraft doctor` reports which required variables are missing by reading `.env.local` / `.env`.
It prints names and availability only, never values.

| Provider    | Variables                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Supabase    | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`                                    |
| Firebase    | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, plus the `NEXT_PUBLIC_FIREBASE_*` client keys |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN`                                                                                               |

`FIREBASE_PRIVATE_KEY` is stored with literal `\n` sequences by most hosts; the generated code
converts them back to real newlines.

### Provider setup

- **Supabase** — enable Google under Authentication → Providers, register `<origin>/auth/callback`
  as a redirect URL, then run `supabase/products.sql` in the SQL editor to create the table,
  indexes, and RLS policies.
- **Firebase** — enable Google sign-in, create a service account for `firebase-admin`, and deploy
  rules with `firebase deploy --only firestore:rules`.

---

## Update & Conflict Handling

Generated code belongs to your project. OpenCraft treats any local edit as authoritative and never
silently overwrites it. Every installed file's checksum is recorded in `opencraft.config.json`,
which lets the CLI distinguish three states:

| State        | Meaning                                                  |
| ------------ | -------------------------------------------------------- |
| `unchanged`  | Byte-identical to the registry template. Safe to update. |
| `customised` | You edited it. Never overwritten without `--overwrite`.  |
| `missing`    | Recorded but deleted from disk.                          |

```bash
opencraft diff image-upload      # unified diff of local vs registry
opencraft update image-upload    # re-applies only if nothing was customised
opencraft add image-upload --dry-run
```

**Honest limitation:** `update` is deliberately conservative. If _any_ file of a module was
edited, the update aborts and asks you to reconcile by hand — there is no three-way merge yet.
Silently merging into code you own is worse than refusing.

`remove` is equally cautious: it refuses when another installed module depends on the target,
refuses to delete files you customised, and never uninstalls npm packages, since your own code may
import them. All commands are idempotent.

---

## Deployment

Deployment configuration is part of the package, not a separate step left to an AI. Install a
`deploy-*` module to get tested config for your target.

### Docker / self-hosted — `deploy-docker`

The base template sets `output: "standalone"` in `next.config.ts`, so `next build` emits a minimal
`.next/standalone` runtime tree. The module adds:

- **`Dockerfile`** — multi-stage (dependencies → builder → runner), non-root `nextjs` user,
  frozen-lockfile install, BuildKit-cache-friendly layout, based on the official
  `next.js/examples/with-docker` pattern.
- **`.dockerignore`** — keeps secrets and build artifacts out of the image context.
- **`compose.yaml`** — runs the image with a healthcheck against `/api/health`, `restart:
unless-stopped`, and reads `.env.local` for provider keys.

```bash
docker build -t my-app .
docker compose up
```

### Vercel — `deploy-vercel`

Adds `vercel.json` (framework, build/install commands, regions) and a PR preview workflow that
runs type-check, lint, test, and build before merge. **Production deploys are deliberately not
automated by this module**: run `vercel --prod` or configure production in the dashboard when you
are ready to ship — production is an explicitly authorized action.

---

## Monorepo Layout & Local Development

```text
opencraft/
├── packages/
│   ├── create-opencraft-app/    # Scaffolding CLI executable
│   ├── cli/                     # In-project management CLI (@antihero/cli)
│   ├── config/                  # Configuration schema & parser (@antihero/config)
│   ├── registry/                # Module registry engine (@antihero/registry)
│   └── shared/                  # Shared utilities (@antihero/shared)
├── templates/
│   └── nextjs-base/             # Base Next.js App Router template
├── registry/
│   ├── architectures/           # Architecture directory definitions
│   ├── modules/                 # 27 production-grade module definitions
│   └── presets/                 # Validated product presets
├── docs/
│   ├── planning/                # Development plan
│   └── research/                # Verified API research
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### Local development commands

```bash
# Install all workspace dependencies
pnpm install

# Build all monorepo packages
pnpm run build

# Lint, type-check, and test across packages
pnpm run verify

# Validate registry module manifests (exports, governance, files, deps)
pnpm run registry:validate

# Verify dry-run packaging + secret scan
pnpm run pack:check

# Rename the npm scope (if using your own organization)
node scripts/rename-scope.mjs @your-scope
```

---

## Publishing to npm

Releases are driven by [Changesets](https://github.com/changesets/changesets) and published from CI:

1. `pnpm changeset` — describe the change (creates a changeset file).
2. Merge, then run the **Publish to NPM** workflow from the Actions tab (`workflow_dispatch`,
   manual on purpose). It versions packages, builds, verifies the tarballs, and publishes
   everything with a pending release.

Publishing uses **npm trusted publishing (OIDC)** — no `NPM_TOKEN` is configured. Each package
needs its own trusted publisher entry on npmjs.com pointing at this repository and the `publish.yml`
workflow. The workflow runs Node 24 / npm 11+, which OIDC requires.

To verify packaging without publishing:

```bash
pnpm run build
pnpm run pack:check   # npm pack --dry-run for every publishable package
```

### Changing the npm scope

The default scope is `@antihero`. Package names are centralised so switching is a single command:

```bash
node scripts/rename-scope.mjs @your-scope
pnpm install
```

This rewrites every `package.json` name, workspace dependency, and source import.
`create-opencraft-app` is unscoped and unaffected.

---

## Roadmap

- Three-way merge for `opencraft update` on customised files (`--apply`, conflict markers)
- Redis/Upstash rate-limit adapter
- Additional auth methods beyond Google (email OTP, passkeys)
- Drizzle and Prisma persistence variants for `crud-example`
- URL install (`opencraft add <url>` / registry items from remote)
- `deploy-gcp` module (Cloud Run / App Engine)
- `apps/docs` documentation site

---

## Contributing a Registry Module

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

1. Create `registry/modules/<name>/module.json`.
2. Add templates under `registry/modules/<name>/templates/`.
3. Map targets per architecture using placeholders (`{{dir.domain}}`, `{{aliases.components}}`,
   `{{dir.sharedComponents}}`).
4. Declare `dependencies`, `npmDependencies`, `environmentVariables`, `exports`, and
   `governance`.
5. Run `pnpm run registry:validate` and add a test. New templates must satisfy the security
   invariants and behavioural tests.

---

## License

Distributed under the [MIT License](LICENSE).
