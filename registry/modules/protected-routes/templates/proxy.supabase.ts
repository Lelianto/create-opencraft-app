import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — Next.js 16 renamed the `middleware` convention to `proxy`.
 * Runs on the Node.js runtime by default; the `runtime` option is not allowed here.
 *
 * Its job is narrow and deliberate:
 *   1. Refresh the Supabase session cookie so it does not expire mid-session.
 *   2. Redirect unauthenticated users away from app pages, as a UX nicety.
 *
 * This is NOT the authorization boundary. Proxy can be skipped, matchers drift,
 * and it never sees per-resource ownership. Every Route Handler and Server
 * Component must still call `requireUser()` and re-check ownership itself.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // `getUser()` revalidates the token with Supabase and refreshes it when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    // Only a path is round-tripped, never a full URL, so this cannot be turned
    // into an open redirect.
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
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
