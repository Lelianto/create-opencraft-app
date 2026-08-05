import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — Next.js 16 renamed the `middleware` convention to `proxy`.
 * Runs on the Node.js runtime by default; the `runtime` option is not allowed here.
 *
 * This performs a cheap *presence* check on the session cookie to redirect
 * obviously-anonymous visitors away from app pages.
 *
 * It deliberately does NOT verify the cookie. Cryptographic verification needs
 * firebase-admin and a network round trip, which is too heavy to run in front of
 * every request — and a redirect is not a security control anyway. A forged
 * cookie gets past this and is then rejected by `requireUser()`, which calls
 * `verifySessionCookie(token, true)` inside the Route Handler or Server
 * Component. That is where authorization actually happens.
 */
const SESSION_COOKIE_NAME = "session";

export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSessionCookie && isProtected(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    // Only a path is round-tripped, never a full URL, so this cannot be turned
    // into an open redirect.
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

/** Page prefixes that require a session. Extend as the app grows. */
function isProtected(pathname: string): boolean {
  return ["/dashboard", "/products"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const config = {
  /*
   * Without a matcher, proxy runs on every request — including static assets and
   * optimised images — which wastes work and can break asset loading. This
   * negative pattern excludes those.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
