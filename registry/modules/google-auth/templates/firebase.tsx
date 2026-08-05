"use client";

import { useState } from "react";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Google sign-in via the Firebase client SDK.
 *
 * Flow: sign in in the browser, then exchange the resulting ID token for an
 * httpOnly session cookie at `/api/auth/session`. The long-lived credential
 * therefore lives in a cookie the browser cannot read from JavaScript, not in
 * localStorage.
 *
 * `signInWithPopup` is used rather than `signInWithRedirect`: redirect-based flows
 * depend on third-party cookies for cross-domain state, which modern browsers
 * increasingly block. Popups avoid that, at the cost of needing a user gesture.
 */

/** Initialised lazily so a missing env var cannot break module import or build. */
function getClientApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  });
}

export function GoogleSignIn({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);

    try {
      const credential = await signInWithPopup(
        getAuth(getClientApp()),
        new GoogleAuthProvider(),
      );
      const token = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) throw new Error("Session exchange failed");

      // Only same-origin relative paths are followed.
      router.replace(next?.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      // Keep the message generic; auth errors can leak configuration details.
      setError("Could not sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={signIn} disabled={pending}>
        {pending ? "Signing in…" : "Continue with Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
