import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { getAdminApp, SESSION_COOKIE_NAME } from "@/infrastructure/auth";

/**
 * Session cookie exchange for Firebase Auth.
 *
 * The client signs in with the Firebase JS SDK, then posts the resulting ID token
 * here. We verify it and mint an httpOnly session cookie, so the browser never
 * needs to keep a long-lived credential in JavaScript-readable storage.
 *
 * `getAdminApp()` is called **inside** the handlers, never at module scope.
 * Initialising firebase-admin at import time makes `next build` fail while
 * collecting page data, because the credentials are not present (or not valid) in
 * a build environment.
 */

/** 14 days, in seconds. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;

  if (typeof token !== "string" || !token) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TOKEN", message: "Missing ID token" } },
      { status: 400 },
    );
  }

  try {
    const auth = getAuth(getAdminApp());

    // Verify before minting. `true` rejects tokens from revoked sessions.
    const decoded = await auth.verifyIdToken(token, true);

    /*
     * Refuse tokens that were not issued in the last few minutes. This limits the
     * window in which a stolen ID token can be upgraded into a long-lived session.
     */
    const issuedAgeMs = Date.now() - decoded.auth_time * 1000;
    if (issuedAgeMs > 5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: { code: "STALE_TOKEN", message: "Please sign in again" } },
        { status: 401 },
      );
    }

    const sessionCookie = await auth.createSessionCookie(token, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true, // not readable from JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // survives the OAuth redirect while blocking cross-site POSTs
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({ success: true, data: { status: "ok" } });
  } catch {
    // Never echo the provider's message: it can leak configuration details.
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TOKEN", message: "Could not create session" } },
      { status: 401 },
    );
  }
}

/** Sign out: clear the cookie and revoke refresh tokens on the server. */
export async function DELETE() {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_NAME)?.value;

  if (existing) {
    try {
      const auth = getAuth(getAdminApp());
      const decoded = await auth.verifySessionCookie(existing, false);
      // Revoking means the session cannot be resurrected elsewhere.
      await auth.revokeRefreshTokens(decoded.sub);
    } catch {
      // Already invalid; clearing the cookie is still correct.
    }
  }

  store.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true, data: { status: "signed-out" } });
}
