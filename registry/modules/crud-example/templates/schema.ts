import { z } from "zod";

/**
 * Shared schemas for the Product entity.
 *
 * The same schema is used on the client (for immediate form feedback) and on the
 * server (as the authoritative check). Server-side validation is what actually
 * protects the data; the client copy is a UX convenience only.
 *
 * `.strict()` rejects unknown keys, which prevents mass assignment: a caller
 * cannot smuggle `ownerId`, `id`, or `createdAt` into a create or update.
 */
export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().trim().max(2_000).nullable(),
    price: z.number().nonnegative("Price cannot be negative").max(1_000_000),
    imageUrl: z.url("Must be a valid URL").nullable().optional(),
  })
  .strict();

/** Every field optional, but at least one must be present. */
export const productUpdateSchema = productInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: "Provide at least one field to update" },
);

/**
 * Query parameters for the list endpoint.
 *
 * `sort` is an enum rather than a free string. Never interpolate a client-supplied
 * column name into a query or pass it to an ORM's order-by: that is how ordering
 * turns into an injection or information-disclosure bug.
 */
export const productListQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().positive().max(10_000).default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["createdAt", "updatedAt", "name", "price"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPage {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Convert a ZodError into field errors for an ApiFailure response.
 *
 * Zod 4 deprecated `error.flatten()`; `issues` is the supported shape.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    result[key] = [...(result[key] ?? []), issue.message];
  }

  return result;
}
