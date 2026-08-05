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
