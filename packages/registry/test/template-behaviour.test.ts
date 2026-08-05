import { describe, expect, it } from "vitest";
import {
  AppError,
  errorCodes,
  toAppError,
} from "../../../registry/modules/error-handling/templates/errors.js";
import {
  getRole,
  hasRole,
  isAdmin,
  isOwner,
  requireOwnerOrAdmin,
  requireRole,
} from "../../../registry/modules/role-permission/templates/roles.js";
import { __testing, writeAuditLog } from "../../../registry/modules/audit-log/templates/audit-log.js";
import { makeUser } from "./stubs/auth.js";

/**
 * Behavioural regression tests for security-critical template logic.
 *
 * Each test below corresponds to a real bug found in an audit. They exist so those
 * specific failures cannot return silently — template code ships to users but is
 * never compiled or executed in this repo, so without these it is unguarded.
 */

describe("role-permission: anonymous users hold no role", () => {
  // Regression: getRole(null) returned "member", so hasRole(null, "member") was
  // true and any member-level guard passed for a signed-out caller.
  it("returns null rather than a default role for an anonymous user", () => {
    expect(getRole(null)).toBeNull();
  });

  it("denies every role requirement when there is no user", () => {
    expect(hasRole(null, "member")).toBe(false);
    expect(hasRole(null, "admin")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("grants member but not admin to an authenticated user by default", () => {
    const user = makeUser();
    expect(hasRole(user, "member")).toBe(true);
    // Defaults must deny: admin is only granted from a trusted, non-client-writable
    // source that the integrator wires up explicitly.
    expect(hasRole(user, "admin")).toBe(false);
    expect(isAdmin(user)).toBe(false);
  });

  it("never derives a role from a field attached to the user object", () => {
    // A user-controlled `role` (e.g. copied from Supabase user_metadata, which
    // auth.updateUser() lets users rewrite) must not confer admin.
    const tampered = { ...makeUser(), role: "admin" } as ReturnType<typeof makeUser>;
    expect(isAdmin(tampered)).toBe(false);
  });
});

describe("role-permission: typed errors drive correct status codes", () => {
  it("throws UNAUTHENTICATED (401) for an anonymous caller", () => {
    try {
      requireRole(null, "member");
      expect.unreachable("requireRole should throw for an anonymous user");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("UNAUTHENTICATED");
      expect((error as AppError).status).toBe(401);
    }
  });

  it("throws FORBIDDEN (403) when the role is insufficient", () => {
    try {
      requireRole(makeUser(), "admin");
      expect.unreachable("requireRole should throw for an insufficient role");
    } catch (error) {
      expect((error as AppError).code).toBe("FORBIDDEN");
      expect((error as AppError).status).toBe(403);
    }
  });

  it("returns the user when the requirement is met", () => {
    const user = makeUser();
    expect(requireRole(user, "member")).toBe(user);
  });
});

describe("role-permission: ownership", () => {
  it("matches only the owning user", () => {
    const user = makeUser({ id: "owner" });
    expect(isOwner(user, "owner")).toBe(true);
    expect(isOwner(user, "someone-else")).toBe(false);
  });

  it("never treats a null owner id as ownership", () => {
    // Otherwise a row with a null owner would be readable by everyone.
    expect(isOwner(makeUser(), null)).toBe(false);
    expect(isOwner(makeUser(), undefined)).toBe(false);
    expect(isOwner(null, null)).toBe(false);
  });

  it("answers NOT_FOUND rather than FORBIDDEN for another user's resource", () => {
    // A 403 confirms the resource exists, which leaks information to someone
    // probing identifiers.
    try {
      requireOwnerOrAdmin(makeUser({ id: "a" }), "b");
      expect.unreachable("requireOwnerOrAdmin should throw");
    } catch (error) {
      expect((error as AppError).code).toBe("NOT_FOUND");
      expect((error as AppError).status).toBe(404);
    }
  });
});

describe("audit-log: secret redaction", () => {
  const { redact, isSensitiveKey } = __testing;

  // Regression: the redaction set held camelCase keys while the lookup lower-cased
  // them, so these four were logged in the clear.
  it.each(["apiKey", "privateKey", "accessToken", "refreshToken"])(
    "redacts camelCase key %s",
    (key) => {
      expect(isSensitiveKey(key)).toBe(true);
      expect(redact({ [key]: "super-secret" })).toEqual({ [key]: "[redacted]" });
    },
  );

  it.each([
    "password",
    "token",
    "secret",
    "api_key",
    "authorization",
    "cookie",
    "client_secret",
  ])("redacts snake_case and lowercase key %s", (key) => {
    expect(redact({ [key]: "super-secret" })).toEqual({ [key]: "[redacted]" });
  });

  it("redacts compound names", () => {
    expect(redact({ stripeApiKey: "sk_live_x", userPassword: "hunter2" })).toEqual({
      stripeApiKey: "[redacted]",
      userPassword: "[redacted]",
    });
  });

  it("redacts nested values", () => {
    expect(redact({ outer: { inner: { apiKey: "x" } } })).toEqual({
      outer: { inner: { apiKey: "[redacted]" } },
    });
  });

  it("preserves non-sensitive values", () => {
    expect(redact({ productId: "abc", count: 3, ok: true })).toEqual({
      productId: "abc",
      count: 3,
      ok: true,
    });
  });

  it("bounds depth, array length, and string size", () => {
    let deep: Record<string, unknown> = { value: "leaf" };
    for (let i = 0; i < 10; i += 1) deep = { nested: deep };
    expect(JSON.stringify(redact(deep))).toContain("depth-limited");

    const long = redact(Array.from({ length: 200 }, (_, i) => i)) as unknown[];
    expect(long.length).toBeLessThanOrEqual(51);

    const big = redact({ blob: "x".repeat(5_000) }) as { blob: string };
    expect(big.blob).toMatch(/truncated/);
  });

  it("never throws, so auditing cannot break the request it describes", async () => {
    await expect(
      writeAuditLog({ action: "product.delete", actorId: "u1", metadata: { token: "t" } }),
    ).resolves.toBeUndefined();
  });
});

describe("error-handling: internal errors do not leak", () => {
  it("collapses an unknown error to a generic INTERNAL failure", () => {
    const leaky = new Error("connection string postgres://user:pw@host/db failed");
    const appError = toAppError(leaky);

    expect(appError.code).toBe("INTERNAL");
    expect(appError.status).toBe(500);
    // The provider message must not reach the client payload.
    expect(appError.message).toBe(errorCodes.INTERNAL.message);
    expect(JSON.stringify(appError.toApiFailure())).not.toContain("postgres://");
  });

  it("passes an AppError through unchanged", () => {
    const original = new AppError("FORBIDDEN");
    expect(toAppError(original)).toBe(original);
  });
});
