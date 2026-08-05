import "server-only";
import { getFirestore, Timestamp, type Query } from "firebase-admin/firestore";
import { getAdminApp } from "@/infrastructure/auth";
import { AppError } from "@/lib/errors";
import type {
  Product,
  ProductInput,
  ProductListQuery,
  ProductPage,
  ProductUpdate,
} from "./schema";

/**
 * Firestore-backed persistence for Product.
 *
 * Security notes specific to NoSQL:
 *   - The collection name is a module constant. A client-supplied collection or
 *     field path is never accepted, which rules out query-shape injection.
 *   - `sort` is resolved through an allowlist, never passed through raw.
 *   - Writes name every field explicitly, so unknown keys cannot be persisted.
 *   - Security Rules (see `firestore.rules`) are the backstop. The Admin SDK
 *     bypasses them entirely, so the ownership filters below are what actually
 *     enforce access control on this path.
 */

const COLLECTION = "products";

const sortFields = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  name: "name",
  price: "price",
} as const;

interface ProductDoc {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function db() {
  return getFirestore(getAdminApp());
}

function toProduct(id: string, doc: ProductDoc): Product {
  return {
    id,
    name: doc.name,
    description: doc.description,
    price: doc.price,
    imageUrl: doc.imageUrl,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

export async function listProducts(
  ownerId: string,
  query: ProductListQuery,
): Promise<ProductPage> {
  try {
    const base = db().collection(COLLECTION).where("ownerId", "==", ownerId);

    // Firestore cannot count and page in one call, so the total is fetched
    // separately with an aggregation query (no document reads).
    const totalSnapshot = await base.count().get();
    const total = totalSnapshot.data().count;

    let cursor: Query = base.orderBy(sortFields[query.sort], query.direction);

    // Offset paging keeps this example readable. Firestore bills for skipped
    // documents, so switch to `startAfter(cursor)` keyset paging for large sets.
    if (query.page > 1) cursor = cursor.offset((query.page - 1) * query.pageSize);

    const snapshot = await cursor.limit(query.pageSize).get();

    let items = snapshot.docs.map((doc) => toProduct(doc.id, doc.data() as ProductDoc));

    // Firestore has no substring operator. Filtering in memory is honest for a
    // reference implementation; use a search service for real full-text search.
    if (query.search) {
      const needle = query.search.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(needle));
    }

    return { items, page: query.page, pageSize: query.pageSize, total };
  } catch (error) {
    throw new AppError("INTERNAL", "Could not load products", undefined, error);
  }
}

/** Returns `null` when the document is missing *or* not owned by the caller. */
export async function findProduct(ownerId: string, id: string): Promise<Product | null> {
  try {
    const snapshot = await db().collection(COLLECTION).doc(id).get();
    if (!snapshot.exists) return null;

    const data = snapshot.data() as ProductDoc;
    // Ownership is checked after the read; never return another user's document.
    if (data.ownerId !== ownerId) return null;

    return toProduct(snapshot.id, data);
  } catch (error) {
    throw new AppError("INTERNAL", "Could not load product", undefined, error);
  }
}

export async function createProduct(ownerId: string, input: ProductInput): Promise<Product> {
  try {
    const now = Timestamp.now();
    // `ownerId` comes from the verified session, never from the request body.
    const doc: ProductDoc = {
      name: input.name,
      description: input.description,
      price: input.price,
      imageUrl: input.imageUrl ?? null,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    const reference = await db().collection(COLLECTION).add(doc);
    return toProduct(reference.id, doc);
  } catch (error) {
    throw new AppError("INTERNAL", "Could not create product", undefined, error);
  }
}

export async function updateProduct(
  ownerId: string,
  id: string,
  input: ProductUpdate,
): Promise<Product | null> {
  const reference = db().collection(COLLECTION).doc(id);

  try {
    const snapshot = await reference.get();
    if (!snapshot.exists) return null;
    if ((snapshot.data() as ProductDoc).ownerId !== ownerId) return null;

    const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.price !== undefined) patch.price = input.price;
    if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;

    await reference.update(patch);

    const updated = await reference.get();
    return toProduct(updated.id, updated.data() as ProductDoc);
  } catch (error) {
    throw new AppError("INTERNAL", "Could not update product", undefined, error);
  }
}

/** Returns `false` when nothing matched, so the caller can answer 404. */
export async function deleteProduct(ownerId: string, id: string): Promise<boolean> {
  const reference = db().collection(COLLECTION).doc(id);

  try {
    const snapshot = await reference.get();
    if (!snapshot.exists) return false;
    if ((snapshot.data() as ProductDoc).ownerId !== ownerId) return false;

    await reference.delete();
    return true;
  } catch (error) {
    throw new AppError("INTERNAL", "Could not delete product", undefined, error);
  }
}
