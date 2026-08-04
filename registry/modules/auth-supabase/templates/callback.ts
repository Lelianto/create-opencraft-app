import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const allowedRedirect = (candidate: string, base: string): boolean => {
  try {
    const url = new URL(candidate, base);
    return url.origin === new URL(base).origin;
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  if (code) {
    const store = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => store.getAll(),
          setAll: (items) => {
            try {
              items.forEach(({ name, value, options }) => store.set(name, value, options));
            } catch {
              // Server Components cannot set cookies.
            }
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && allowedRedirect(next, appUrl)) return NextResponse.redirect(new URL(next, appUrl));
  }
  return NextResponse.redirect(new URL("/", appUrl));
}