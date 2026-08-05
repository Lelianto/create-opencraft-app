import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const modules = path.join(repoRoot, "registry/modules");

/**
 * Registry templates are inert source files in this repo — they are never compiled
 * here, they are copied into generated projects. That means a bug inside a template
 * cannot be caught by type-checking or by the normal test suite.
 *
 * These aliases let the tests import the real template sources directly and execute
 * them, with the project-relative `@/...` specifiers resolved to either a stub or to
 * the actual template that would satisfy them in a generated app. So the security
 * invariants are asserted against the code users receive, not a copy of it.
 */
export default defineConfig({
  test: {
    environment: "node",
    coverage: { provider: "v8" },
  },
  resolve: {
    alias: {
      // Next.js marker module; a no-op outside a Next build.
      "server-only": path.join(here, "test/stubs/server-only.ts"),
      // Resolves to the genuine error-handling template, so status-code mapping is
      // exercised for real rather than mocked.
      "@/lib/errors": path.join(modules, "error-handling/templates/errors.ts"),
      "@/infrastructure/auth": path.join(here, "test/stubs/auth.ts"),
    },
  },
});
