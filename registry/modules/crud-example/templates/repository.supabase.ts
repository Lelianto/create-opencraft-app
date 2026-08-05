import "server-only";
import { createSupabaseServerClient } from "@/infrastructure/auth";
import { AppError } from "@/lib/errors";
import type {
  Product,
  ProductInput,
  ProductListQuery,
  ProductPage,
  ProductUpdate,
} from "./schema";

/**
 * Supabase-backed persistence for Product.
 *
 * Two layers of protection apply, deliberately:
 *   1. Every query is scoped to `owner_id` here, in application code.
 *   2. Row Level Security enforces the same rule in the database (see
 *      `supabase/products.sql`).
 *
 * The RLS policy is the backstop. Never rely on it alone — a service-role key
 * bypasses RLS entirely, so the explicit ownership filter is what keeps this
 * correct if the client is ever swapped.
 *
 * All access goes through the query builder, which parameterises values. Nothing
 * here concatenates user input into SQL.
 */

/** Maps API field names to physical column names via an allowlist. */
const sortColumns = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  name: "name",
  price: "price",
} as const;

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image_url,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProducts(
  ownerId: string,
  query: ProductListQuery,
): Promise<ProductPage> {
  const supabase = await createSupabaseServerClient();
  const from = (query.page - 1) * query.pageSize;

  let builder = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("owner_id", ownerId);

  if (query.search) {
    // `ilike` arguments are parameterised. `%` and `_` are escaped so a search
    // term cannot widen the pattern.
    const escaped = query.search.replace(/[%_\\]/g, (match) => `\\${match}`);
    builder = builder.ilike("name", `%${escaped}%`);
  }

  const { data, error, count } = await builder
    .order(sortColumns[query.sort], { ascending: query.direction === "asc" })
    .range(from, from + query.pageSize - 1);

  if (error) throw new AppError("INTERNAL", "Could not load products", undefined, error);

  return {
    items: (data ?? []).map((row) => toProduct(row as ProductRow)),
    page: query.page,
    pageSize: query.pageSize,
    total: count ?? 0,
  };
}

/** Returns `null` when the row does not exist *or* is not owned by the caller. */
export async function findProduct(ownerId: string, id: string): Promise<Product | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Could not load product", undefined, error);
  return data ? toProduct(data as ProductRow) : null;
}

export async function createProduct(ownerId: string, input: ProductInput): Promise<Product> {
  const supabase = await createSupabaseServerClient();

  // `owner_id` is taken from the verified session, never from the request body.
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      description: input.description,
      price: input.price,
      image_url: input.imageUrl ?? null,
      owner_id: ownerId,
    })
    .select("*")
    .single();

  if (error) throw new AppError("INTERNAL", "Could not create product", undefined, error);
  return toProduct(data as ProductRow);
}

export async function updateProduct(
  ownerId: string,
  id: string,
  input: ProductUpdate,
): Promise<Product | null> {
  const supabase = await createSupabaseServerClient();

  // Only explicitly named columns are written, so unknown keys can never reach
  // the database even if validation were bypassed.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = input.price;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Could not update product", undefined, error);
  return data ? toProduct(data as ProductRow) : null;
}

/** Returns `false` when nothing matched, so the caller can answer 404. */
export async function deleteProduct(ownerId: string, id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", "Could not delete product", undefined, error);
  return Boolean(data);
}
