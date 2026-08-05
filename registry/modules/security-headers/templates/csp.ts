/**
 * Strict Content-Security-Policy with a per-request nonce.
 *
 * ## Why this is opt-in
 *
 * The baseline policy in `src/config/security.ts` allows `'unsafe-inline'` for
 * scripts, because Next.js injects inline bootstrap and hydration scripts. That
 * is honest but weak: it does not stop injected inline script.
 *
 * A nonce fixes that — but a nonce must be unique per request, and a unique value
 * cannot be embedded in statically prerendered HTML. **Using this forces the
 * pages it covers to be dynamically rendered**, so you lose static optimisation
 * for them. That is a real cost; adopt it deliberately rather than by default.
 *
 * ## Wiring it up
 *
 * 1. Install the proxy: `opencraft add protected-routes` (or create `proxy.ts`).
 * 2. In `proxy.ts`, generate a nonce and attach the headers:
 *
 * ```ts
 * import { buildStrictCsp, applyStrictCsp } from "@/lib/csp";
 *
 * export function proxy(request: NextRequest) {
 *   const nonce = createNonce();
 *   const requestHeaders = new Headers(request.headers);
 *   requestHeaders.set("x-nonce", nonce);
 *
 *   const response = NextResponse.next({ request: { headers: requestHeaders } });
 *   return applyStrictCsp(response, nonce);
 * }
 * ```
 *
 * 3. Remove the `Content-Security-Policy` entry from `src/config/security.ts` so
 *    the static header does not shadow this one.
 * 4. Read the nonce in a Server Component with
 *    `(await headers()).get("x-nonce")` and pass it to any `<Script nonce={...}>`.
 */

/** Cryptographically random, single-use nonce. */
export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildStrictCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    /*
     * 'strict-dynamic' lets a nonced script load further scripts it trusts,
     * which is what makes this workable with a bundler.
     *
     * 'unsafe-eval' is required in development only: React uses eval() to
     * rebuild server-side error stacks in the browser. Neither React nor
     * Next.js needs it in production.
     */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    /*
     * Tailwind and Next inject inline <style> tags. 'unsafe-inline' is retained
     * for styles because a style-based attack is far less severe than script
     * execution, and removing it breaks the framework. Documented, not hidden.
     */
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https:",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Attach the strict policy to a response. */
export function applyStrictCsp<T extends { headers: Headers }>(response: T, nonce: string): T {
  response.headers.set("Content-Security-Policy", buildStrictCsp(nonce));
  return response;
}
