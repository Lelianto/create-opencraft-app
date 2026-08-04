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

## License

Distributed under the [MIT License](LICENSE).
