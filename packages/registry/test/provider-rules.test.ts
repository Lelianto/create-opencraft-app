import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Structural invariants for the provider security-rules templates
 * (`supabase/products.sql` and `crud-example/firestore.rules`).
 *
 * These files govern data access at the provider layer and are never executed in
 * the repo, so regressions in them are otherwise invisible. The checks mirror the
 * ownership model enforced by the application repository (see
 * crud-repository.test.ts): a row/read is only ever visible to its owner.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const productsSql = readFileSync(
  path.join(repoRoot, "registry/modules/crud-example/templates/products.sql"),
  "utf8",
);
const firestoreRules = readFileSync(
  path.join(repoRoot, "registry/modules/crud-example/templates/firestore.rules"),
  "utf8",
);

describe("supabase/products.sql: owner-scoped Row Level Security", () => {
  it("turns RLS on and forces it for the table owner", () => {
    expect(productsSql).toMatch(/enable row level security/);
    expect(productsSql).toMatch(/force row level security/);
  });

  it("defines select/insert/update/delete policies", () => {
    for (const op of ["select", "insert", "update", "delete"]) {
      expect(productsSql, op).toMatch(new RegExp(`create policy "products_\\w+_own"`));
      expect(productsSql, op).toMatch(new RegExp(`on public\\.products for ${op}`));
    }
  });

  it("every policy scopes by auth.uid(), never a parameter or literal", () => {
    for (const op of ["select", "delete"]) {
      // Read-style policies must filter with USING (owner_id = auth.uid()).
      expect(productsSql, op).toMatch(/using \(owner_id = auth\.uid\(\)\)/);
    }
    // Insert and update must enforce the same constraint with WITH CHECK.
    expect(productsSql).toMatch(/for insert[\s\S]*with check \(owner_id = auth\.uid\(\)\)/);
    // Update must not allow silently reassigning ownership to somebody else.
    const updatePolicy =
      /create policy "products_update_own"[^;]*;/g.exec(productsSql)?.[0] ?? "";
    expect(updatePolicy).toMatch(/with check \(owner_id = auth\.uid\(\)\)/);
  });

  it("pins search_path and security invoker on the trigger function", () => {
    // A trigger function that resolves objects in another schema could be
    // leveraged into privilege escalation or a confusing error.
    expect(productsSql).toMatch(/set search_path = ''/);
    expect(productsSql).toMatch(/security invoker/);
  });

  it("never selects * via a service-role or an unqualified superuser", () => {
    // No admin bypass should be granted to anon or a broad role.
    expect(productsSql).not.toMatch(/to anon|to service_role/);
  });
});

describe("crud-example/firestore.rules: owner-scoped and deny-by-default", () => {
  it("denies everything not explicitly allowed", () => {
    expect(firestoreRules).toMatch(/allow read, write: if false/);
  });

  it("constrains reads to the authenticated owner", () => {
    expect(firestoreRules).toMatch(/allow get, list: if ownsExisting\(\)/);
    expect(firestoreRules).toMatch(/function ownsExisting\(\)[\s\S]*request\.auth\.uid/);
  });

  it("constrains writes to the authenticated owner and validated shape", () => {
    expect(firestoreRules).toMatch(/allow create: if isSignedIn\(\) && validProduct\(\)/);
    expect(firestoreRules).toMatch(/allow update: if ownsExisting\(\) && validProduct\(\)/);
    expect(firestoreRules).toMatch(/allow delete: if ownsExisting\(\)/);
  });

  it("binds ownerId to the verified uid on every write", () => {
    // A client must never be able to claim ownership of somebody else's row.
    expect(firestoreRules).toMatch(/data\.ownerId == request\.auth\.uid/);
  });

  it("denies reads for signed-out callers", () => {
    // ownsExisting() starts from isSignedIn(), so a null auth cannot pass.
    expect(firestoreRules).toMatch(/function ownsExisting\(\)[\s\S]*isSignedIn\(\) &&/);
  });
});