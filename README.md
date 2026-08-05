# OpenCraft

<p align="center">
  <strong>Production-Ready, Modular Next.js Project Generator & Scaffolding Engine</strong>
</p>

<p align="center">
  Next.js App Router • TypeScript Strict • Tailwind CSS • shadcn/ui • Zod Validation • Security-First Architecture
</p>

---

OpenCraft is an open-source, modular project generator and CLI engine for **Next.js**. Built with a **shadcn-style philosophy**—where all generated code is added directly into your repository—OpenCraft eliminates repetitive setup work so developers and AI coding agents can build features immediately without rewriting authentication, storage adapters, server validation, or security rules from scratch.

---

## Key Features & Highlights

- 🏗️ **3 Component Architectures**: Choose between **Hybrid** (recommended), **Feature-based**, or **Atomic Design** layouts.
- ⚡ **Backend Flexibility**: Native adapters for **Supabase**, **Firebase**, or **Standalone (Backend-less)** setups.
- 🔑 **Google Authentication**: Pre-wired OAuth flow with server-side session verification for Supabase Auth and Firebase Auth.
- 📦 **Multi-Provider Storage Adapters**: Unified file storage interface supporting **Vercel Blob**, **Supabase Storage**, and **Firebase Storage**.
- 🛡️ **Security-First Architecture**: SSRF protection, rate limiting, security headers, safe Zod server validation, role-based access control, and path traversal prevention by default.
- 🤖 **AI-Optimized Context (`AGENTS.md`)**: Dynamically generates tailored rules for AI coding assistants (Cursor, Gemini, Claude) so AI never invents broken abstractions or breaks architecture rules.
- 🧩 **24 Production-Grade Modules**: Scaffolds authentication, storage pipelines, image compression, data tables, search filters, and full CRUD examples out of the box.

---

## Quick Start

### Create a New Next.js Application

Run the interactive scaffolding tool:

```bash
npx create-opencraft-app my-app
```

#### Interactive Selection Flow

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

#### Non-Interactive Scaffolding

For automated setups or CI scripts, pass flags directly:

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

## CLI In-Project Management (`npx opencraft`)

Once your project is generated, use the `@antihero/cli` tool inside your application directory:

```bash
# Add a module to your application
npx opencraft add image-upload

# List installed & available registry modules
npx opencraft list

# Inspect module metadata, dependencies, and files
npx opencraft info image-upload

# Run diagnostic health check on config & files
npx opencraft doctor

# Compare local file checksums with registry templates
npx opencraft diff image-upload

# Safely update an unmodified module
npx opencraft update image-upload

# Safely remove an installed module
npx opencraft remove image-upload
```

---

## Component Architectures

OpenCraft supports three clear component layouts:

### 1. Hybrid (Default & Recommended)

Combines atomic presentational UI components with domain-driven business features:

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

Domain-driven folder layout where features encapsulate logic and expose clean public exports:

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

## 24 Built-In Modules Matrix

OpenCraft comes with 24 production-ready, modular blocks:

| Category | Module Name | Description |
| --- | --- | --- |
| **Core** | `input-validation` | Centralized Zod schema validation helpers |
| | `api-response` | Standardized API response formatters (`ApiSuccess` / `ApiFailure`) |
| | `error-handling` | Global error handling utilities & React Error Boundaries |
| | `confirmation-dialog` | Reusable shadcn Alert Dialog confirmation component |
| | `security-headers` | Production-ready HTTP security headers middleware |
| | `rate-limit` | In-memory & Redis rate limiting helper for API routes |
| | `ssrf-protection` | Safe fetch utility with DNS validation to prevent SSRF attacks |
| **Auth** | `auth-supabase` | Supabase Auth provider implementation |
| | `auth-firebase` | Firebase Auth & Admin SDK server verification |
| | `google-auth` | Google OAuth sign-in flow UI & backend handlers |
| | `protected-routes` | Server-side route protection & middleware guards |
| | `role-permission` | Role-based access control (RBAC) authorization logic |
| **Storage** | `storage-vercel-blob` | Vercel Blob storage provider adapter |
| | `storage-supabase` | Supabase Storage provider adapter |
| | `storage-firebase` | Firebase Cloud Storage provider adapter |
| | `file-upload` | Secure generic file upload handler with MIME allowlists |
| | `image-upload` | Image compression pipeline with WebP conversion |
| **Application** | `dashboard` | Responsive admin dashboard overview layout |
| | `data-table` | Reusable data table component with sorting & selection |
| | `pagination` | Server-side and client-side pagination UI controls |
| | `search-filter` | URL query-bound search & filter controls |
| | `user-profile` | User settings & profile management UI |
| | `audit-log` | Audit logging service for tracking security events |
| | `crud-example` | Complete end-to-end CRUD pattern reference (Entity: `Product`) |

---

## Unified Storage & Authentication Contracts

OpenCraft avoids complex runtime abstractions while enforcing consistent contracts across providers:

### Unified Storage Interface

```ts
export interface UploadInput {
  data: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
  key?: string;
}

export interface UploadedFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string | Promise<string>;
}
```

### Unified Auth Interface

```ts
export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthService {
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AppUser | null>;
  requireUser(): Promise<AppUser>;
}
```

---

## AI Assistant Integration (`AGENTS.md`)

Every generated application includes a dynamically populated `AGENTS.md` file in the root folder. This file acts as an authoritative guideline for AI coding assistants (such as Cursor, Gemini Code Assist, or GitHub Copilot):

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
```

---

## Monorepo Layout & Local Development

This repository is structured as a Turborepo monorepo with pnpm workspaces:

```text
opencraft/
├── packages/
│   ├── create-opencraft-app/    # Scaffolding CLI executable
│   ├── cli/                     # In-project management CLI (@antihero/cli)
│   ├── config/                  # Configuration schema & parser (@antihero/config)
│   ├── registry/                # Module registry loader (@antihero/registry)
│   └── shared/                  # Shared utilities (@antihero/shared)
├── templates/
│   └── nextjs-base/             # Base Next.js App Router template
├── registry/
│   ├── architectures/           # Architecture directory definitions
│   └── modules/                 # 24 production-grade module definitions
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### Local Development Commands

```bash
# Install all workspace dependencies
pnpm install

# Build all monorepo packages
pnpm run build

# Run linting, type-checking, and test suite across packages
pnpm run verify

# Validate registry module manifests
npm run registry:validate

# Verify dry-run packaging
npm run pack:check

# Rename package scope (if using your own npm organization)
node scripts/rename-scope.mjs @your-scope
```

---

## Security Model

OpenCraft aims to be honest about what it does and does not protect. Every claim
below is implemented in generated code, and every limitation is stated.

### What is enforced by default

| Concern | How it is handled |
| --- | --- |
| Authentication | `requireUser()` verifies the session **server-side** on every request. Supabase uses `auth.getUser()` (revalidates the token); Firebase uses `verifySessionCookie(token, true)` (honours revocation). |
| Authorization / IDOR | Every repository query is scoped by `ownerId`, and a record belonging to another user returns `404`, not `403`, so responses do not confirm existence. |
| Input validation | Zod on the server for body, query, and route params. `.strict()` rejects unknown keys, which blocks mass assignment. |
| SQL injection | All access goes through the Supabase query builder or parameterised RPC. No string-concatenated SQL anywhere. |
| NoSQL abuse | Collection names are constants; sort fields resolve through an allowlist. Raw operators, field paths, and collection names from clients are never accepted. |
| Upload safety | Magic-byte sniffing (never `file.type`), MIME allowlist, size and pixel ceilings, re-encode to WebP, randomised storage keys, per-user rate limits, SVG rejected. |
| Security headers | `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, and CSP with `frame-ancestors 'none'`, applied to every response by `next.config.ts`. |
| Open redirect | OAuth callback validates `next` against the app's own origin and rejects protocol-relative URLs. |
| SSRF | `safeFetch()` enforces a protocol and hostname allowlist, blocks private/loopback/link-local/CGNAT ranges (including IPv4-mapped IPv6), re-validates every redirect hop, and caps time and response size. |
| Error handling | Unknown errors collapse to a generic `INTERNAL` failure. Stack traces and provider messages are never returned to clients. |
| Secret handling | `.env.example` contains names only. `logError()` emits a code and short detail, never tokens, cookies, or request bodies. |

### Stated limitations

These are real gaps. They are documented rather than papered over.

- **The default CSP allows `'unsafe-inline'` for scripts.** Next.js injects inline
  bootstrap scripts, so a policy without either `'unsafe-inline'` or a per-request
  nonce breaks the App Router. The default is therefore useful but is *not* a
  complete XSS defence. Run `opencraft add security-headers` for the strict
  nonce-based policy — at the cost of forcing dynamic rendering.
- **`proxy.ts` is not an authorization boundary.** It refreshes sessions and
  redirects anonymous visitors for convenience. It can be bypassed and never sees
  per-resource ownership, so every Route Handler re-checks identity itself.
- **Rate limiting is in-memory by default.** That means per-instance. On
  serverless or multi-region deployments an attacker gets one bucket per instance.
  Move to Redis or Upstash before relying on it.
- **SSRF protection cannot fully stop DNS rebinding.** The hostname is re-resolved
  by `fetch` after validation. The hostname allowlist is the real control — keep
  it narrow. See the comments in `src/lib/safe-fetch.ts`.
- **Confirmation dialogs are UX, not security.** The server always re-authorises.
- **Provider rules are a backstop, not the control.** Supabase RLS and Firestore
  Rules are generated and should be deployed, but the Admin SDK and service-role
  keys bypass them — which is why ownership is also enforced in application code.

---

## Environment Setup

Secrets live in `.env.local`, which is git-ignored. `.env.example` is committed and
contains variable **names only** — modules append to it as you install them.

```bash
cp .env.example .env.local
# then fill in the values
```

`opencraft doctor` reports which required variables are missing by reading
`.env.local` / `.env`. It prints names and availability only, never values.

| Provider | Variables |
| --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` |
| Firebase | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, plus the `NEXT_PUBLIC_FIREBASE_*` client keys |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` |

`FIREBASE_PRIVATE_KEY` is stored with literal `\n` sequences by most hosts; the
generated code converts them back to real newlines.

### Provider setup

- **Supabase** — enable Google under Authentication → Providers, register
  `<origin>/auth/callback` as a redirect URL, then run `supabase/products.sql` in
  the SQL editor to create the table, indexes, and RLS policies.
- **Firebase** — enable Google sign-in, create a service account for
  `firebase-admin`, and deploy rules with
  `firebase deploy --only firestore:rules`.

---

## Update & Conflict Handling

Generated code belongs to your project. OpenCraft therefore treats any local edit
as authoritative and will not silently overwrite it.

Every installed file's checksum is recorded in `opencraft.config.json`, which lets
the CLI distinguish three states:

| State | Meaning |
| --- | --- |
| `unchanged` | Byte-identical to the registry template. Safe to update. |
| `customised` | You edited it. Never overwritten without `--overwrite`. |
| `missing` | Recorded but deleted from disk. |

```bash
opencraft diff image-upload      # unified diff of local vs registry
opencraft update image-upload    # re-applies only if nothing was customised
opencraft add image-upload --dry-run
```

**Honest limitation:** `update` is deliberately conservative. If *any* file of a
module was edited, the update aborts and asks you to reconcile by hand. There is
no three-way merge. This is a real constraint of the current design, not an
oversight — silently merging into code you own is worse than refusing.

`remove` is equally cautious: it refuses when another installed module depends on
the target, refuses to delete files you customised, and never uninstalls npm
packages, since your own code may import them.

All commands are idempotent. Re-running `add` for an installed module reports its
status and suggests `diff`/`update` instead of reinstalling.

---

## Publishing to npm

Releases are driven by Changesets and published from CI:

1. `pnpm changeset` — describe the change (creates a changeset file).
2. Merge, then run the **Publish to NPM** workflow from the Actions tab
   (`workflow_dispatch`, manual on purpose). It versions packages, builds,
   verifies the tarballs, and publishes everything with a pending release.

Publishing uses **npm trusted publishing (OIDC)** — no `NPM_TOKEN` is configured.
Each package needs its own trusted publisher entry on npmjs.com pointing at this
repository and the `publish.yml` workflow. The workflow runs Node 24 / npm 11+,
which OIDC requires.

To verify packaging without publishing:

```bash
pnpm run build
pnpm run pack:check   # npm pack --dry-run for every publishable package
```

### Changing the npm scope

The default scope is `@antihero`. Package names are centralised so switching is a
single command:

```bash
node scripts/rename-scope.mjs @your-scope
pnpm install
```

This rewrites every `package.json` name, workspace dependency, and source import.
`create-opencraft-app` is unscoped and unaffected.

---

## Roadmap

- Three-way merge for `opencraft update` on customised files
- Redis/Upstash rate-limit adapter
- Additional auth methods beyond Google (email OTP, passkeys)
- Drizzle and Prisma persistence variants for `crud-example`
- `apps/docs` documentation site

---

## Contributing a Registry Module

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

1. Create `registry/modules/<name>/module.json`.
2. Add templates under `registry/modules/<name>/templates/`.
3. Map targets per architecture using placeholders (`{{dir.domain}}`,
   `{{aliases.components}}`, `{{dir.sharedComponents}}`).
4. Declare `dependencies`, `npmDependencies`, and `environmentVariables`.
5. Run `pnpm run registry:validate` and add a test.

---

## License

Distributed under the [MIT License](LICENSE).
