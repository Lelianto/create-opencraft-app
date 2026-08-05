/**
 * Baseline security headers, applied to every response by `next.config.ts`.
 *
 * ## Honest scope of this default
 *
 * `script-src` includes `'unsafe-inline'`. That is a deliberate, documented
 * trade-off: Next.js injects inline bootstrap and hydration scripts, so a CSP
 * without either `'unsafe-inline'` or a per-request nonce breaks the App Router
 * outright. A policy that looks strict but breaks the framework — or that gets
 * disabled in a hurry during an incident — protects nobody.
 *
 * So this baseline is genuinely useful but is NOT a complete XSS defence:
 * it constrains where scripts may be loaded from, but not inline execution.
 * Output encoding and input validation remain your primary XSS controls.
 *
 * To get a genuinely strict `script-src`, install the strict CSP upgrade:
 *
 *     opencraft add security-headers
 *
 * That switches to a per-request nonce with `'strict-dynamic'`. The cost is that
 * every page using it must be dynamically rendered, because a nonce cannot be
 * baked into static HTML. Choose deliberately.
 */
export interface SecurityHeader {
  key: string;
  value: string;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Covers clickjacking; supersedes X-Frame-Options in modern browsers.
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "upgrade-insecure-requests",
].join("; ");

export const securityHeaders: SecurityHeader[] = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Stops MIME sniffing, which matters for anything user-uploaded.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Only honoured over HTTPS, so it is inert during local HTTP development.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
