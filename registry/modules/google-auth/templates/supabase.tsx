"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";

/**
 * Google sign-in via Supabase OAuth (PKCE).
 *
 * `signInWithOAuth` redirects to Google, which returns to `/auth/callback`, where
 * the authorization code is exchanged for a session server-side.
 *
 * `redirectTo` is built from `location.origin` — the browser's own origin — so it
 * cannot be influenced by a query parameter. The callback route independently
 * validates any `next` path before redirecting.
 */
export function GoogleSignIn({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const callback = new URL("/auth/callback", location.origin);
      // Only a relative path is forwarded, never a full URL.
      if (next?.startsWith("/")) callback.searchParams.set("next", next);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });

      if (oauthError) throw oauthError;
      // On success the browser navigates away, so no state reset is needed.
    } catch {
      // Keep the message generic; auth errors can leak configuration details.
      setError("Could not start sign-in. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={signIn} disabled={pending}>
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
