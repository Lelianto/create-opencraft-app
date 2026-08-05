import "server-only";
import type { AppUser } from "@/infrastructure/auth";
import { AppError } from "@/lib/errors";

/**
 * Role-based authorization.
 *
 * ## Where the role must come from — read this before using it
 *
 * A role is a **trust decision**, so it may only come from a source the user
 * cannot write.
 *
 * - **Supabase:** store it in a table you control (for example `profiles.role`),
 *   protected by RLS so only the service role can change it, or in a custom JWT
 *   claim set by an auth hook. **Never** read a role from `user_metadata`:
 *   `supabase.auth.updateUser()` lets any signed-in user rewrite their own
 *   metadata, so a user could simply make themselves an admin. Use
 *   `app_metadata` (server-writable only) or your own table.
 * - **Firebase:** use custom claims set with
 *   `getAuth().setCustomUserClaims(uid, { role: "admin" })` from a trusted
 *   server context. Claims are signed into the token and are not client-writable.
 *
 * The previous version of this module read `role` off the user object via a cast.
 * That was doubly wrong: `AppUser` never carries a `role`, so admin checks always
 * failed silently, and the obvious "fix" of populating it from `user_metadata`
 * would have been a privilege-escalation hole.
 */
export const roles = ["admin", "member"] as const;
export type Role = (typeof roles)[number];

/** Higher rank satisfies any lower requirement. */
const roleRank: Record<Role, number> = { admin: 100, member: 10 };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (roles as readonly string[]).includes(value);
}

/**
 * Resolve a user's role.
 *
 * Returns `null` for anonymous users. It deliberately does NOT fall back to
 * `"member"`: the previous behaviour meant `hasRole(null, "member")` returned
 * true, so a signed-out caller satisfied a member-level check.
 *
 * Replace the body with a lookup against your trusted source. The default is
 * intentionally conservative — everyone authenticated is a `member`, nobody is an
 * admin — so the failure mode is denied access rather than granted access.
 */
export function getRole(user: AppUser | null): Role | null {
  if (!user) return null;

  // Example for Firebase custom claims or a Supabase `app_metadata` role that you
  // have copied onto AppUser in `src/infrastructure/auth.ts`:
  //
  //   if (isRole(user.role)) return user.role;
  //
  // Example for a Supabase profiles table (async, so make callers await):
  //
  //   const { data } = await supabase.from("profiles")
  //     .select("role").eq("id", user.id).single();
  //   return isRole(data?.role) ? data.role : "member";

  return "member";
}

export function hasRole(user: AppUser | null, required: Role): boolean {
  const role = getRole(user);
  if (!role) return false; // anonymous satisfies nothing
  return roleRank[role] >= roleRank[required];
}

export function isAdmin(user: AppUser | null): boolean {
  return getRole(user) === "admin";
}

/**
 * Assert a role, throwing the typed errors the API layer maps to 401/403.
 *
 * Throwing `AppError` rather than a bare `Error` is what makes the difference
 * between a correct status code and an opaque 500.
 */
export function requireRole(user: AppUser | null, required: Role): AppUser {
  if (!user) throw new AppError("UNAUTHENTICATED");
  if (!hasRole(user, required)) throw new AppError("FORBIDDEN");
  return user;
}

/**
 * Ownership check for a single resource.
 *
 * Ownership and role are independent: an admin is not automatically an owner, and
 * an owner is not automatically an admin. Combine them explicitly, e.g.
 * `if (!isOwner(user, row.ownerId) && !isAdmin(user)) throw new AppError("FORBIDDEN")`.
 */
export function isOwner(user: AppUser | null, resourceOwnerId: string | null | undefined): boolean {
  if (!user || !resourceOwnerId) return false;
  return user.id === resourceOwnerId;
}

/** Ownership-or-admin, the common case for edit and delete handlers. */
export function requireOwnerOrAdmin(
  user: AppUser | null,
  resourceOwnerId: string | null | undefined,
): AppUser {
  if (!user) throw new AppError("UNAUTHENTICATED");
  if (!isOwner(user, resourceOwnerId) && !isAdmin(user)) {
    // NOT_FOUND rather than FORBIDDEN: a 403 confirms the resource exists, which
    // leaks information to someone probing identifiers.
    throw new AppError("NOT_FOUND");
  }
  return user;
}
