import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export const SESSION_COOKIE_NAME = "session";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Initialise firebase-admin exactly once.
 *
 * `getApps()` is checked first because Next.js reuses the module across requests
 * and hot reloads; calling `initializeApp` twice throws.
 *
 * `FIREBASE_PRIVATE_KEY` is stored with literal `\n` sequences in most hosting
 * dashboards, so they are converted back to real newlines here.
 */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Resolve the signed-in user from the session cookie, or `null`.
 *
 * `verifySessionCookie(token, true)` checks revocation, so signing out on
 * another device invalidates this session too.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const claims = await getAuth(getAdminApp()).verifySessionCookie(token, true);
    return {
      id: claims.uid,
      email: claims.email ?? "",
      name: typeof claims.name === "string" ? claims.name : null,
      avatarUrl: typeof claims.picture === "string" ? claims.picture : null,
    };
  } catch {
    // Expired, malformed, or revoked. Treated as signed out.
    return null;
  }
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
