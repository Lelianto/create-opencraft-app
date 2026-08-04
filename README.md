# OpenCraft

**OpenCraft** is an open-source, security-first modular project generator for Next.js (App Router, TypeScript strict mode, Tailwind CSS, and shadcn/ui). It allows developers and AI coding agents to rapidly scaffold production-grade Next.js applications with pre-configured component architectures, authentication providers, storage adapters, and modular features without starting from scratch.

## Architecture & Features

- **Component Architectures**:
  - `hybrid` (Default): Combines atomic presentational components with domain-focused feature directories.
  - `feature`: Domain-driven folder layout (`src/features/*`) with index exports.
  - `atomic`: Atomic design principles (`atoms`, `molecules`, `organisms`, `templates`).
- **Backend Providers**: Supabase, Firebase, or None.
- **Authentication**: Google OAuth with server-side session verification.
- **Storage Adapters**: Vercel Blob, Supabase Storage, Firebase Storage, or None.
- **Security & Infrastructure**: Zod server validation, SSRF outbound protection, rate limiting, security headers, role-based authorization, path traversal and MIME file verification.
- **24 Production-Ready Modules**:
  - `input-validation`, `api-response`, `error-handling`, `confirmation-dialog`, `security-headers`, `rate-limit`, `ssrf-protection`
  - `auth-supabase`, `auth-firebase`, `google-auth`, `protected-routes`, `role-permission`
  - `storage-vercel-blob`, `storage-supabase`, `storage-firebase`, `file-upload`, `image-upload`
  - `dashboard`, `data-table`, `pagination`, `search-filter`, `user-profile`, `audit-log`, `crud-example`

## Quick Start

### Create a New Next.js Project

Interactive mode:

```bash
npx create-opencraft-app my-app
```

Non-interactive mode:

```bash
npx create-opencraft-app my-app \
  --architecture hybrid \
  --backend supabase \
  --auth google \
  --storage vercel-blob \
  --modules dashboard,image-upload,crud-example
```

### Managing Modules in Existing Projects

Inside an OpenCraft project directory:

```bash
# Add a module
npx opencraft add image-upload

# List installed & available modules
npx opencraft list

# Display detailed info about a module
npx opencraft info image-upload

# Run diagnostic checks
npx opencraft doctor

# Compare local code against registry templates
npx opencraft diff image-upload

# Update an unmodified module
npx opencraft update image-upload

# Safely remove an installed module
npx opencraft remove image-upload
```

## Monorepo Layout

```text
opencraft/
├── apps/
│   └── docs/
├── packages/
│   ├── create-opencraft-app/
│   ├── cli/
│   ├── config/
│   ├── registry/
│   └── shared/
├── templates/
│   └── nextjs-base/
├── registry/
│   ├── architectures/
│   ├── providers/
│   ├── modules/
│   └── presets/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## Security & AI Guidelines

Every generated project includes a customized `AGENTS.md` file designed for AI coding assistants (like Cursor, Gemini, Claude) instructing them on codebase conventions, server-side validation requirements, and security rules.

## Local Development & Testing

```bash
# Install dependencies
pnpm install

# Build all monorepo packages
pnpm run build

# Run linting, type-checking, and unit tests
pnpm run verify

# Validate module manifests
npm run registry:validate

# Verify dry-run packaging
npm run pack:check
```

## Changing NPM Scope

To customize package naming before publishing:

```bash
node scripts/rename-scope.mjs @your-scope create-your-app-name
```

## License

[MIT](LICENSE)
