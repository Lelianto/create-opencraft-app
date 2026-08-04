# OpenCraft — verified API research (fetched 2026-08-04)

All facts below were fetched from official sources on 2026-08-04. Raw captures live in
`/tmp/ocr/` (next docs markdown, shadcn registry JSON). Re-verify before trusting later.

## Toolchain version decisions

| Package | Pinned | Why not latest |
| --- | --- | --- |
| typescript | **6.0.3** | Latest is 7.0.2, but `typescript-eslint@8.66.0` peers cap TS at `>=4.8.4 <6.1.0`. TS 7 (native port) would break typed linting. 6.0.3 is the newest ecosystem-supported stable. |
| eslint | 10.8.0 | ok |
| @eslint/js | **10.0.1** | `10.8.0` does NOT exist. eslint and @eslint/js are versioned independently. |
| @types/node | 20.19.9 | matches local Node 20.19.6 / engines `>=20.9.0` |
| next | 16.3.0 | engines `node >=20.9.0` |
| react / react-dom | 19.2.8 | |
| tailwindcss + @tailwindcss/postcss | 4.3.3 | |
| zod | 4.x | |
| radix-ui | 1.6.7 | unified package — see below |

## Next.js 16 — verified

### `middleware.ts` is renamed to `proxy.ts`
- `middleware` file convention is **deprecated and renamed to `proxy`** (changelog: `v16.0.0`).
- File at project root or `src/`, same level as `app/`.
- Must export a single function, named `proxy` or default export.
- **Proxy defaults to the Node.js runtime.** The `runtime` config option is NOT available in
  proxy files — setting it throws.
- `export const config = { matcher: [...] }`.
- Without a `matcher`, proxy runs on **every** request including `_next/static`, `_next/image`
  and `public/` assets — always set a negative matcher.
- Docs explicitly advise avoiding proxy unless no other option exists, and warn not to rely on
  shared modules/globals. This reinforces our rule: **never treat proxy as the authorization
  boundary** — always re-check auth in the Route Handler / Server Component.

```ts
// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = { matcher: '/about/:path*' }
```

### `cookies()` is async
`cookies()` from `next/headers` is an **async** function. Read in Server Components; read/write
in Server Functions and Route Handlers.

```ts
const cookieStore = await cookies()
cookieStore.get('theme')
cookieStore.set(name, value, options)   // allowed in Route Handlers
cookieStore.delete(name)
```
Methods: `get`, `getAll`, `has`, `set`, `delete`, `toString`.
Set options: `name value expires maxAge domain path secure httpOnly sameSite priority partitioned`.
Only `path` has a default (`'/'`).

### Route Handler dynamic params are a Promise

```ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ team: string }> }
) {
  const { team } = await params
}
```
There is also a globally available generated helper (no import needed, produced by
`next dev` / `next build` / `next typegen`):
```ts
export async function GET(_req: NextRequest, ctx: RouteContext<'/users/[id]'>) {
  const { id } = await ctx.params
}
```
We use the explicit `Promise<...>` form in templates so generated code type-checks before the
first `next typegen` run.

### CSP with nonce (official recipe)
Nonce must be generated per request in `proxy.ts` and **requires dynamic rendering**.

```ts
const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
const isDev = process.env.NODE_ENV === 'development'
const csp = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'nonce-${nonce}';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
```
- In **development** `'unsafe-eval'` is required because React uses `eval` for debugging.
  Not required in production.
- Honest limitation to document: the nonce approach forces dynamic rendering, so it is
  **opt-in**, not our default. Default CSP must be static-render-safe.
- `frame-ancestors 'none'` covers clickjacking; no `X-Frame-Options` needed.

## shadcn/ui — verified

- Registry base URL for Tailwind v4: `https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`
  (`/r/<name>.json` returns 404 — the old path is gone.)
- Components are **plain function components** with `data-slot="..."` attributes.
  No `forwardRef` (React 19 style).
- Radix is now the **single unified `radix-ui` package** (1.6.7), not `@radix-ui/react-*`:
  ```ts
  import { Slot } from "radix-ui"
  import type { Label as LabelPrimitive } from "radix-ui"
  ```
- `class-variance-authority` (0.7.1) is still used by `button`/`badge` even though it is not
  listed in the registry item's `dependencies`.
- Registry sources import siblings as `@/registry/new-york-v4/ui/<x>` — must be rewritten to
  `@/components/ui/<x>` when vendoring.
- `form` still uses react-hook-form (`Controller`, `FormProvider`, `useFormContext`,
  `useFormState`) + `@hookform/resolvers` + `zod`.
- Toasts: **`sonner`** (2.0.7) + `next-themes` (0.4.6). The old `toast` component is gone.
- npm deps across the components we vendor:
  `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-hook-form`,
  `@hookform/resolvers`, `zod`, `sonner`, `next-themes`, `lucide-react`.
- `lib/utils.ts` is exactly:
  ```ts
  import { clsx, type ClassValue } from "clsx"
  import { twMerge } from "tailwind-merge"
  export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
  ```

### Theme CSS variables
Real values available from `https://ui.shadcn.com/r/colors/neutral.json`, keys
`cssVars.light` / `cssVars.dark` / `cssVarsV4`. Values are `oklch(...)`, e.g.
`background: oklch(1 0 0)`, `foreground: oklch(0.145 0 0)`, `destructive: oklch(0.577 0.245 27.325)`,
`radius: 0.625rem`, plus `chart-1..5` and `sidebar*`.

## Provider SDK hints (NOT yet fully verified — re-verify before use)

Partial signals only; the research agents lost their detailed findings.

- `@supabase/ssr` 0.12.x: cookie API is `getAll`/`setAll`; **`setAll(cookiesToSet, headers)`
  reportedly takes a new second argument** — VERIFY against installed types.
- Supabase has a newer `getClaims()` (asymmetric JWT verification) alongside
  `getUser()`/`getSession()`. Server-side authority order needs verification.
- `@vercel/blob` 2.6.1: `access: 'private'` is reportedly supported (not just `'public'`), and
  a `get()` function was added. VERIFY.
- `image-size` 2.0.2 exists — candidate for pure-JS server-side dimension checks.

**Unverified / still to confirm:** all Supabase/Firebase/Vercel Blob exact signatures, Zod 4
error-formatting API (`treeifyError`/`prettifyError` vs deprecated `flatten`),
`@hookform/resolvers` v5 import path for Zod 4, `browser-image-compression` EXIF behaviour,
`@clack/prompts` 1.x vs the 0.11.0 currently pinned, `commander` 15 vs 14 pinned, Vitest 4
`projects` vs `workspace` config key.
