import type { AppUser } from "@/infrastructure/auth";

export const roles = ["admin", "member"] as const;
export type Role = (typeof roles)[number];

const roleRank: Record<Role, number> = { admin: 100, member: 10 };

export function getRole(user: AppUser | null): Role {
  if (!user) return "member";
  const raw = (user as AppUser & { role?: unknown }).role;
  return raw === "admin" ? "admin" : "member";
}

export function isAdmin(user: AppUser | null): boolean {
  return getRole(user) === "admin";
}

export function hasRole(user: AppUser | null, required: Role): boolean {
  return roleRank[getRole(user)] >= roleRank[required];
}

export function requireRole(user: AppUser | null, required: Role): AppUser {
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!hasRole(user, required)) throw new Error("FORBIDDEN");
  return user;
}

export function isOwner(user: AppUser | null, resourceOwnerId: string | null | undefined): boolean {
  return user !== null && user.id === resourceOwnerId;
}