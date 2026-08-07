# Living Context

This file is generated from resolved OpenCraft Context Packs. Machine-readable sources live in `contexts/` and `project/`.

## Vision

- **Purpose:** Build fast, server-rendered web applications with clear separation between server and client concerns.
- **Target users:** Product teams shipping content-heavy and interactive web apps.
- **Primary journey:** Route renders on the server; interactive islands hydrate on the client; mutations round-trip through the server.

## Technology stack

- Language: TypeScript
- Runtime: Node.js LTS
- Framework: Next.js App Router
- TypeScript 5.x — language
- eslint 9.x — linting
- prettier — formatting
- vitest — unit-test-runner
- Next.js 15.x — framework
- React 19.x — ui-library
- Tailwind CSS — styling
- Node.js >=20 LTS — runtime
- npm — package-manager

## Conventions

### naming
- `conv-naming-files` — Files use kebab-case for modules and PascalCase for components and classes.
- `conv-naming-types` — Type aliases and interfaces use PascalCase; avoid the I-prefix convention.
- `conv-react-components` — Component files are PascalCase; component names match their file names.
- `conv-next-files` — Colocate route, layout, loading, and error files in route segments; use their reserved file names.
- `conv-node-file-case` — Module files use kebab-case; entrypoints match their package name.

### formatting
- `conv-format-prettier` — All source is formatted with prettier; no manual line wrapping decisions.
- `conv-react-self-closing` — Use self-closing tags for components without children.
- `conv-next-format` — Prettier with default Next.js settings; imports sorted.
- `conv-node-format` — Source is formatted with prettier; line width 100.

### imports
- `conv-import-type` — Use `import type` for type-only imports so the bundler can drop them.
- `conv-import-order` — Group external, then internal, then relative imports, separated by blank lines.
- `conv-react-import-order` — Import React/ReactDOM, external libs, then internal modules, then styles.
- `conv-next-import` — Import server-only modules with the `server-only` package where they must not reach the client.
- `conv-node-import-type` — Use `import type` for type-only imports in TypeScript modules.

### state
- `conv-state-exhaustive` — Exhaustive switches use the `never` return type to catch unhandled unions.
- `conv-react-derived` — Derive values during render instead of mirroring them in state.
- `conv-react-lift` — Lift shared state to the closest common ancestor only when needed.
- `conv-next-state` — UI state lives in components; durable state lives on the server; nothing durable is client-only.
- `conv-node-async` — Top-level code is async-aware; avoid fire-and-forget promises unless errors are handled.

### structure
- `conv-structure-exports` — Barrel files re-export public API only; never re-export types via `export *` from typed internals.
- `conv-react-compose` — Compose small components; a component that renders more than one screen is a sign to split.
- `conv-next-colocate` — Keep segment-specific code inside its route segment folder.
- `conv-next-shared` — Shared UI and logic live in src/components and src/lib, never in route segments.
- `conv-node-separation` — Business logic is separated from HTTP transport handlers.

## Security

- **CRITICAL** `CTRL-NEXT-001` — Validate and authorize every Server Action and route handler on the server.
- **CRITICAL** `CTRL-NEXT-002` — Never pass secrets to Client Components; use server-only modules and environment access.
- **HIGH** `CTRL-NEXT-003` — Escape and encode user content at render boundaries; avoid dangerouslySetInnerHTML.
- **HIGH** `CTRL-NEXT-004` — Set security headers (CSP, HSTS, X-Frame-Options) in next.config or middleware.
- **CRITICAL** `CTRL-SEC-001` — Validate input at every trust boundary; fail closed.
- **CRITICAL** `CTRL-SEC-002` — Authorize every operation server-side with deny-by-default.
- **CRITICAL** `CTRL-SEC-003` — Encrypt data at rest and in transit (TLS 1.2+).
- **HIGH** `CTRL-SEC-004` — Log security-relevant events; never log secrets or PII.
- **HIGH** `CTRL-SEC-005` — Pin and scan dependencies; track advisories to resolution.

## Active contexts

| ID | Title | Level | Enforcement |
|---|---|---|---|
| `ctx-core-evidence-standard` | Completion claims must be backed by fresh, reproducible evidence | 2 | warn |
| `ctx-core-honest-claims` | No unsupported completion, quality, or success claims | 2 | warn |
| `ctx-core-production-authority` | Production, destructive, and external actions require explicit human authority | 3 | block |
| `ctx-core-secrets-protection` | Secrets must never be committed or exposed | 3 | block |
| `ctx-nextjs-app-router` | New routes must use the App Router | 3 | block |
| `ctx-nextjs-data-fetching` | Data fetching must use Server Components and Next.js primitives | 3 | warn |
| `ctx-nextjs-server-actions` | Mutations must be Server Actions with server-side validation and authorization | 3 | block |
| `ctx-node-esm` | New Node modules must use ECMAScript modules | 2 | warn |
| `ctx-node-runtime-version` | Node runtime version must match the declared engines range | 3 | block |
| `ctx-react-functional-components` | Components must be written as functions | 2 | warn |
| `ctx-react-hooks-rules` | Hooks must follow the Rules of Hooks | 3 | block |
| `ctx-react-keys` | List items must use stable, unique keys | 2 | warn |
| `ctx-security-authz-server` | Authorization must be enforced server-side, never trusted from the client | 4 | block |
| `ctx-security-dependency-hygiene` | Dependencies must be pinned, locked, and scanned | 3 | block |
| `ctx-security-input-validation` | All untrusted input must be validated and normalized at the server boundary | 4 | block |
| `ctx-security-secrets` | Secrets must be stored in a secret manager and never committed | 4 | block |
| `ctx-testing-gates` | CI must gate on tests, and failures must be real | 3 | block |
| `ctx-testing-risk-proportional` | Test effort must be proportional to risk | 3 | warn |
| `ctx-typescript-no-explicit-any` | Code must not introduce explicit `any` | 2 | warn |
| `ctx-typescript-path-aliases` | Imports must use configured path aliases, not deep relative paths | 2 | comment |
| `ctx-typescript-strict` | TypeScript must run in strict mode | 3 | block |

## AI coding rules

See `ai/AGENTS.md` (rendered) and `project/ai-rules.yaml` (structured).

## Sources

This living context is resolved from the packs declared in `packs.yaml`; versions are pinned in `packs.lock.json`.
