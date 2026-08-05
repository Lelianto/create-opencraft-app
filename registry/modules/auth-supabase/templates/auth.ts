import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail loudly at the call site instead of surfacing a confusing SDK error.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Supabase client bound to the request's cookies.
 *
 * `cookies()` is async in Next.js 16. Server Components cannot mutate cookies,
 * so `setAll` is intentionally tolerant there — token refresh happens in
 * `proxy.ts` instead.
 */
export async function createSupabaseServerClient() {
  const store = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Called from a Server Component; refresh is handled in proxy.ts.
          }
        },
      },
    },
  );
}

/**
 * Resolve the signed-in user, or `null`.
 *
 * Uses `getUser()`, which revalidates the access token against Supabase. Never
 * use `getSession()` for authorization: it trusts unverified cookie contents.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const metadata = user.user_metadata as { name?: unknown; avatar_url?: unknown };
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof metadata.name === "string" ? metadata.name : null,
    avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
  };
}

/**
 * Server-side authentication guard for Route Handlers and Server Components.
 *
 * This is the only sanctioned way to establish identity. Never derive the
 * current user from a request header, query parameter, or request body — those
 * are attacker-controlled.
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}
