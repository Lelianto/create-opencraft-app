import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Google OAuth callback.
 *
 * Exchanges the PKCE authorization code for a session, then redirects.
 *
 * The `next` parameter is attacker-controllable, so it is validated against this
 * app's own origin before use. Redirecting to a raw `next` value is the classic
 * open-redirect bug: an attacker sends `?next=https://evil.example` and uses your
 * trusted domain as a springboard.
 */
function resolveSafeRedirect(candidate: string | null, base: string): URL {
  const fallback = new URL("/", base);
  if (!candidate) return fallback;

  // Reject protocol-relative URLs (`//evil.example`) before parsing, since
  // `new URL("//evil.example", base)` silently adopts the foreign host.
  if (candidate.startsWith("//")) return fallback;

  try {
    const target = new URL(candidate, base);
    // Same-origin only. Compare full origin, not just hostname, so a downgrade
    // to http:// is also refused.
    if (target.origin !== new URL(base).origin) return fallback;
    return target;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  /*
   * Prefer the configured canonical origin so redirects are stable behind a
   * proxy or load balancer; fall back to the request's own origin.
   */
  const base = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl.origin;

  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const target = resolveSafeRedirect(requestUrl.searchParams.get("next"), base);

  // The provider reports denials via `error`; treat it as a normal outcome.
  if (providerError || !code) {
    const failure = new URL("/", base);
    failure.searchParams.set("auth", "failed");
    return NextResponse.redirect(failure);
  }

  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Never surface the provider's message: it can leak configuration details.
    const failure = new URL("/", base);
    failure.searchParams.set("auth", "failed");
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(target);
}
