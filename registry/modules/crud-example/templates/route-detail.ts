import { requireUser } from "@/infrastructure/auth";
import { ok, fail } from "@/lib/api-response";
import { AppError, logError, toAppError } from "@/lib/errors";
import { deleteProduct, findProduct, updateProduct } from "{{import.domain}}/products/repository";
import { productUpdateSchema, toFieldErrors } from "{{import.domain}}/products/schema";
import { z } from "zod";

// In Next.js 16 dynamic route params are delivered as a Promise.
type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.string().min(1).max(128);

/**
 * Resolve and authorise the target record in one step.
 *
 * Every handler below goes through this, so a caller who guesses another user's
 * id gets an indistinguishable 404 rather than a 403 — the response does not
 * confirm that the record exists (IDOR hardening).
 */
async function requireOwnedProduct(ownerId: string, rawId: string) {
  const id = idSchema.safeParse(rawId);
  if (!id.success) throw new AppError("NOT_FOUND");

  const product = await findProduct(ownerId, id.data);
  if (!product) throw new AppError("NOT_FOUND");

  return product;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await requireOwnedProduct(user.id, id));
  } catch (error) {
    logError("GET /api/products/[id]", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireOwnedProduct(user.id, id);

    const body: unknown = await request.json().catch(() => null);
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", undefined, toFieldErrors(parsed.error));
    }

    const updated = await updateProduct(user.id, id, parsed.data);
    if (!updated) throw new AppError("NOT_FOUND");

    return ok(updated);
  } catch (error) {
    logError("PATCH /api/products/[id]", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireOwnedProduct(user.id, id);

    const removed = await deleteProduct(user.id, id);
    if (!removed) throw new AppError("NOT_FOUND");

    return ok({ id });
  } catch (error) {
    logError("DELETE /api/products/[id]", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}
