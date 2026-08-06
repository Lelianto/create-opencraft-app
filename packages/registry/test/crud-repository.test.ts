import { afterEach, describe, expect, it, vi } from "vitest";

let lastQuery: FakeQuery["records"];

class FakeQuery {
  records: { method: string; args: unknown[] }[] = [];

  private record(method: string, ...args: unknown[]) {
    this.records.push({ method, args });
    return this;
  }

  select = (columns?: string, opts?: { count: string }) => this.record("select", columns, opts);
  eq = (col: string, value: unknown) => this.record("eq", col, value);
  ilike = (col: string, pattern: string) => this.record("ilike", col, pattern);
  order = (col: string, opts?: unknown) => this.record("order", col, opts);
  range = (from: number, to: number) => this.record("range", from, to);
  insert = (row: unknown) => this.record("insert", row);
  update = (patch: unknown) => this.record("update", patch);
  delete = () => this.record("delete");

  maybeSingle() {
    lastQuery = this.records;
    return { data: null, error: null };
  }
  single() {
    lastQuery = this.records;
    this.record("single");
    return {
      data: {
        id: "prod-1",
        name: "P",
        description: null,
        price: 10,
        image_url: null,
        owner_id: OWNER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    };
  }

  // listProducts awaits the final chain directly (no trailing terminator method
  // that returns a Promise). Read it as an async generator: the awaited promise
  // resolves only after the whole chain has been recorded.
  then(onfulfilled?: (value: { data: null; error: null }) => unknown) {
    lastQuery = this.records;
    return Promise.resolve({ data: null, error: null }).then(onfulfilled);
  }
}

vi.mock("@/infrastructure/auth", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: () => new FakeQuery(),
  })),
}));

import {
  createProduct,
  findProduct,
  listProducts,
  updateProduct,
} from "../../../registry/modules/crud-example/templates/repository.supabase.js";

const OWNER = "owner-1";

function filtersOf() {
  return lastQuery.filter((r) => r.method === "eq" || r.method === "ilike");
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("crud repository (supabase): every query is scoped to the owner", () => {
  it("scopes list by owner_id", async () => {
    await listProducts(OWNER, {
      page: 1,
      pageSize: 10,
      search: "",
      sort: "createdAt",
      direction: "desc",
    });
    expect(filtersOf()).toContainEqual({ method: "eq", args: ["owner_id", OWNER] });
  });

  it("scopes find by owner_id", async () => {
    await findProduct(OWNER, "prod-1");
    expect(filtersOf()).toEqual([
      { method: "eq", args: ["id", "prod-1"] },
      { method: "eq", args: ["owner_id", OWNER] },
    ]);
  });

  it("scopes update by owner_id", async () => {
    await updateProduct(OWNER, "prod-1", { name: "Renamed" });
    expect(filtersOf()).toContainEqual({ method: "eq", args: ["owner_id", OWNER] });
  });

  it("writes owner_id from the verified session, not the input", async () => {
    await createProduct(OWNER, { name: "P", description: null, price: 10 });
    const insert = lastQuery.find((r) => r.method === "insert");
    const row = insert?.args[0] as Record<string, unknown>;
    expect(row.owner_id).toBe(OWNER);
    // A 'owner_id' on a client-pasted input must never reach the database.
    expect(Object.keys(row)).not.toContainEqual("ownerId");
  });
});

describe("crud repository (supabase): search terms cannot widen the pattern", () => {
  it("escapes wildcard characters", async () => {
    await listProducts(OWNER, {
      page: 1,
      pageSize: 10,
      search: "50% off",
      sort: "createdAt",
      direction: "asc",
    });
    const pattern = lastQuery.find((r) => r.method === "ilike")?.args[1] as string;
    expect(pattern).toBe("%50\\% off%");
  });
});