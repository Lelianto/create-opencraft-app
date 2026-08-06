"use client";

import { useRouter } from "next/navigation";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signOut as firebaseSignOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sign-out for Firebase.
 *
 * Revokes the session server-side via DELETE /api/auth/session (which clears the
 * httpOnly cookie and calls `revokeRefreshTokens`), then signs out of the client
 * SDK and refreshes the route tree.
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

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    try {
      await firebaseSignOut(getAuth(getClientApp()));
    } catch {
      // The cookie is already cleared; nothing else to do client-side.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      <LogOut className="size-4" aria-hidden />
      Sign out
    </Button>
  );
}
