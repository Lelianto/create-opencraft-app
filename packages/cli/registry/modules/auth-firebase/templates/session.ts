import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days, seconds

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ success: false, error: { code: "INVALID_TOKEN", message: "Missing ID token" } }, { status: 401 });
  }
  try {
    const sessionCookie = await getAuth(app).createSessionCookie(token, { expiresIn: SESSION_MAX_AGE * 1000 });
    const store = await cookies();
    store.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return NextResponse.json({ success: true, data: { status: "ok" } });
  } catch {
    return NextResponse.json({ success: false, error: { code: "INVALID_TOKEN", message: "Unable to create session" } }, { status: 401 });
  }
}