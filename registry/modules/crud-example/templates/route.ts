import { requireUser } from "@/infrastructure/auth";
import { ok, fail } from "@/lib/api-response";
import { AppError, logError, toAppError } from "@/lib/errors";
import { createProduct, listProducts } from "{{import.domain}}/products/repository";
import {
  productInputSchema,
  productListQuerySchema,
  toFieldErrors,
} from "{{import.domain}}/products/schema";

/**
 * GET /api/products — the caller's own products, searchable and paginated.
 *
 * The handler never accepts an owner id from the client; it is derived from the
 * verified session, so one user cannot enumerate another user's rows.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();

    const url = new URL(request.url);
    const parsed = productListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", "Invalid query parameters", toFieldErrors(parsed.error));
    }

    const page = await listProducts(user.id, parsed.data);
    return ok(page);
  } catch (error) {
    logError("GET /api/products", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}

/** POST /api/products — create a product owned by the caller. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body: unknown = await request.json().catch(() => null);
    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", undefined, toFieldErrors(parsed.error));
    }

    const product = await createProduct(user.id, parsed.data);
    return ok(product, 201);
  } catch (error) {
    logError("POST /api/products", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}
