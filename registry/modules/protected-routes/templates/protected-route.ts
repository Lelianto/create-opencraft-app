import { requireUser } from "@/infrastructure/auth";
import { ok, fail } from "@/lib/api-response";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return fail("UNAUTHENTICATED", "Authentication required", 401);
  }
  return ok({ id: user.id, email: user.email, name: user.name });
}