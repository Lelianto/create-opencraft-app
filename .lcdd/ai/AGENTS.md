# AI coding rules (from OpenCraft Context Packs)

Rules below are structured, merged, and versioned via `.lcdd/contexts/` and `.lcdd/project/ai-rules.yaml`.

## Rules

- **MUST** `ai-ts-strict` — Keep tsconfig strict mode enabled; never relax it to silence a type error. (Relaxing strictness reintroduces the failures strict mode prevents.)
- **MUST NOT** `ai-ts-unknown` — Do not write explicit `any` types, even to make a compile pass. (`any` disables the type system for the entire reachable surface.)
- **SHOULD** `ai-ts-import-type` — Prefer `import type` for type-only imports. (Produces smaller bundles and clearer intent.)
- **MUST** `ai-ts-run-checks` — Run the type-check and lint commands and fix all reported errors before finishing. (Completion claims require fresh command output per the evidence standard.)
- **MUST** `ai-react-functional` — Write new components as function components using hooks. (Matches the current supported React model.)
- **MUST** `ai-react-hooks` — Follow the Rules of Hooks: top-level calls, complete dependency arrays. (Violations cause stale closures that are hard to detect.)
- **SHOULD** `ai-react-keys` — Use stable identity keys for list items, never bare indexes for reorderable lists. (Index keys corrupt state reuse and accessibility.)
- **MUST** `ai-react-a11y` — Include accessible labels, focus handling, and keyboard operability in every interactive component. (Accessibility is a delivery input, not final polish.)
- **MUST NOT** `ai-react-no-generated-ui` — Do not generate decorative, interchangeable layouts; ground visual decisions in product meaning. (OpenCraft rejects generic AI-generated design.)
- **MUST** `ai-core-evidence` — Back every completion claim with fresh command output; record unexecuted checks as "not run". (Completion, release readiness, and production health are separate, verifiable claims.)
- **MUST NOT** `ai-core-secrets` — Never write secrets, credentials, or private operational details into code, config, logs, fixtures, or examples. (Exposed secrets are a supply-chain and incident risk.)
- **MUST** `ai-core-authority` — Never execute production, destructive, purchasing, or external actions without explicit human authority. (Preparation is allowed; execution against production is not.)
- **MUST NOT** `ai-core-honest` — Do not invent metrics, testimonials, social proof, or unsupported success claims; reject generic AI-generated design without product evidence. (Originality and truthfulness come from domain meaning and user behavior.)
- **MUST** `ai-core-lcdd` — Read .lcdd/CONTEXT.md and obey the active contexts and conventions materialized there. (Living context is the enforced, current source of project knowledge.)
- **MUST** `ai-next-router` — Use the App Router for all new routes; never extend pages/. (One router keeps caching and data-fetching semantics consistent.)
- **MUST** `ai-next-server-first` — Fetch in Server Components by default; mark client components explicitly with 'use client'. (Server-first rendering is the Next.js performance and correctness model.)
- **MUST** `ai-next-mutations` — Route durable mutations through Server Actions or route handlers with server-side validation and authorization. (Client-only mutations bypass enforcement and audit.)
- **MUST** `ai-next-revalidate` — Revalidate affected routes after every mutation with revalidatePath or revalidateTag. (Stale caches after writes violate the living-context promise.)
- **MUST NOT** `ai-next-secrets` — Do not expose secrets to the client; keep server-only code behind the server-only boundary. (Server components can leak to the client bundle if misused.)
- **MUST** `ai-sec-validate` — Validate and normalize all untrusted input at the server boundary before use. (Injection and logic flaws begin with unvalidated input.)
- **MUST** `ai-sec-authz` — Re-check authorization server-side on every protected operation; never trust client claims. (Client-side gates are not authorization.)
- **MUST NOT** `ai-sec-secrets` — Never write, copy, or generate secrets into code, config, logs, fixtures, or examples. (Exposed secrets are a supply-chain and incident risk.)
- **MUST** `ai-sec-encoding` — Encode output for its context; never concatenate unsanitized user input into HTML, SQL, or URLs. (Output encoding is the injection defense that cannot be omitted.)
- **SHOULD** `ai-sec-threat` — When adding a feature that touches data or boundaries, note the threat model implications and new trust boundaries. (Security is a delivery input, not final polish.)
- **SHOULD** `ai-test-proportional` — Write tests proportional to the risk of the change; cover high-risk paths with integration or E2E evidence. (Weak coverage is not verification.)
- **MUST NOT** `ai-test-no-weak` — Never weaken a failing test, remove assertions, or skip tests to make a suite pass. (Drifting the test to match broken code is specification drift.)
- **MUST** `ai-test-run` — Run the focused test suite and report fresh output before claiming completion. (Completion claims require fresh command output.)
- **MUST** `ai-test-regression` — Add a regression test that fails on the old behavior before fixing a bug. (Regressions are only proven by a test that reproduces the failure.)
- **MUST** `ai-node-lts` — Assume the Node LTS version declared in engines; never rely on non-LTS-only APIs. (Runtime version drift between environments causes production surprises.)
- **SHOULD** `ai-node-esm` — Write new modules as ESM. (Predictable static analysis and bundling.)
- **MUST** `ai-node-handle-errors` — Handle rejected promises and stream errors; never leave unhandled rejections. (Unhandled rejections crash Node processes in modern runtimes.)
- **MUST NOT** `ai-node-no-secrets` — Do not embed secrets, connection strings, or private operational details in code or config. (Secrets in source are a supply-chain and exposure risk.)

## Pack prose

### typescript-pack v1.0.0

# TypeScript pack AI rules

Follow the conventions declared by typescript-pack:

- Keep `strict: true`. Never relax tsconfig to silence errors.
- Never write explicit `any`.
- Use `import type` for type-only imports.
- Run type-check and lint; only claim completion with fresh passing output.

### react-pack v1.0.0

# React pack AI rules

Follow the conventions declared by react-pack:

- Function components and hooks only; no new class components.
- Respect the Rules of Hooks with complete dependency arrays.
- Use stable identity keys for lists.
- Ship accessible labels, focus, and keyboard operability.
- No decorative, interchangeable AI-generated layouts.

### core-pack v1.0.0

# Core pack AI rules

- Back every completion claim with fresh command output; record "not run" honestly.
- Never write secrets into code, config, logs, fixtures, or examples.
- Never execute production, destructive, or external actions without explicit human authority.
- No invented metrics, testimonials, or unsupported success claims.
- Read `.lcdd/CONTEXT.md` and obey the active contexts materialized there.

### nextjs-pack v1.0.0

# Next.js pack AI rules

Follow the conventions declared by nextjs-pack:

- App Router only for new routes; never extend pages/.
- Server Components by default; fetch server-side with declared caching.
- Durable mutations run in Server Actions / route handlers with server-side validation, authorization, and cache revalidation.
- Never expose secrets to the client.
- Run type-check, lint, and tests before claiming completion.

### security-pack v1.0.0

# Security pack AI rules

Security rules are non-negotiable:

- Validate and normalize all untrusted input at the server boundary.
- Re-check authorization server-side; deny by default.
- Never emit secrets into code, config, logs, fixtures, or examples.
- Encode output for its context; no injection sinks.
- Flag threat-model implications of features that touch data or boundaries.

### testing-pack v1.0.0

# Testing pack AI rules

- Write tests proportional to risk; high-risk paths need integration/E2E evidence.
- Never weaken a test, remove assertions, or skip tests to pass.
- Run the focused suite and report fresh output before claiming completion.
- Add a regression test that fails on old behavior before fixing a bug.

### node-pack v1.0.0

# Node pack AI rules

Follow the conventions declared by node-pack:

- Assume the declared Node LTS runtime; no non-LTS-only APIs.
- Write new modules as ESM.
- Handle every rejected promise and stream error.
- Never embed secrets in code, config, logs, or examples.
