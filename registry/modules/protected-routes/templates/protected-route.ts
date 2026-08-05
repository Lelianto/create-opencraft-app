import { requireUser } from "@/infrastructure/auth";
import { ok, fail } from "@/lib/api-response";
import { logError, toAppError } from "@/lib/errors";

/**
 * GET /api/me — the canonical shape of a protected Route Handler.
 *
 * Identity comes from `requireUser()`, which verifies the session against the
 * auth provider on the server. Never read the caller's identity from a header,
 * query parameter, or request body: those are attacker-controlled.
 *
 * Copy this try/catch shape for every protected endpoint. The catch converts a
 * thrown AppError into the right status code and keeps internal details out of
 * the response.
 */
export async function GET() {
  try {
    const user = await requireUser();
    return ok({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
  } catch (error) {
    logError("GET /api/me", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}
