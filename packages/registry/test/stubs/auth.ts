/**
 * Stub for the auth module a generated project would provide.
 *
 * Mirrors the real `AppUser` contract exactly — including the deliberate absence of
 * a `role` field. That absence is the point: `role-permission` previously cast a
 * role onto this type, which is why its admin check silently never succeeded.
 */
export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    avatarUrl: null,
    ...overrides,
  };
}

/**
 * Minimal double for the Supabase server client returned by
 * `createSupabaseServerClient` in a generated app. The crud repository tests
 * replace this module entirely with a recording query builder; this declaration
 * exists so template sources that reference the function type-check.
 */
/** Result shape of a list query: rows arrive as an array. */
export interface SupabaseListResult {
  // Mirror Supabase's untyped client: rows are `any` and the repository template
  // casts them to its own row shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  error: unknown;
  count?: number | null;
}

/** Result shape of a single-row query: one row or null. */
export interface SupabaseRowResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: unknown;
}

/** A chainable builder that is also awaitable, mirroring PostgrestFilterBuilder. */
export interface SupabaseQueryBuilder extends PromiseLike<SupabaseListResult> {
  select(columns?: string, opts?: { count: string }): SupabaseQueryBuilder;
  eq(column: string, value: unknown): SupabaseQueryBuilder;
  ilike(column: string, pattern: string): SupabaseQueryBuilder;
  order(column: string, opts?: { ascending?: boolean }): SupabaseQueryBuilder;
  range(from: number, to: number): SupabaseQueryBuilder;
  insert(row: unknown): SupabaseQueryBuilder;
  update(patch: Record<string, unknown>): SupabaseQueryBuilder;
  delete(): SupabaseQueryBuilder;
  maybeSingle(): Promise<SupabaseRowResult>;
  single(): Promise<SupabaseRowResult>;
}

export function createSupabaseServerClient(): Promise<{
  from(table: string): SupabaseQueryBuilder;
}> {
  const builder = {
    select: () => builder,
    eq: () => builder,
    ilike: () => builder,
    order: () => builder,
    range: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    then: (onfulfilled: (value: SupabaseListResult) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onfulfilled),
  } as SupabaseQueryBuilder;
  return Promise.resolve({ from: () => builder });
}
