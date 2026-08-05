import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Structural security invariants across every registry template.
 *
 * Behavioural tests cover logic that can be imported and executed. These cover the
 * properties that are architectural rather than functional — "no route template
 * trusts a client header for identity" cannot be unit tested, but it can be
 * enforced by inspection, and it is exactly the class of bug that shipped in 0.1.1.
 *
 * Static analysis is a blunt instrument and these checks are intentionally narrow:
 * they detect the specific regressions that already happened, rather than trying to
 * prove security in general.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const modulesRoot = path.join(repoRoot, "registry/modules");
const baseTemplate = path.join(repoRoot, "templates/nextjs-base");

function walk(dir: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else output.push(full);
  }
  return output;
}

interface TemplateFile {
  module: string;
  file: string;
  relative: string;
  source: string;
  /** Source with comment lines removed, so prose about a pattern is not a match. */
  code: string;
}

const templates: TemplateFile[] = readdirSync(modulesRoot)
  .filter((name) => statSync(path.join(modulesRoot, name)).isDirectory())
  .flatMap((moduleName) => {
    const templatesDir = path.join(modulesRoot, moduleName, "templates");
    let files: string[];
    try {
      files = walk(templatesDir);
    } catch {
      // A module without a templates directory is not a failure here; the registry
      // validator covers manifest completeness.
      return [];
    }
    return files.map((file) => {
      const source = readFileSync(file, "utf8");
      const code = source
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
        })
        .join("\n");
      return {
        module: moduleName,
        file,
        relative: path.relative(modulesRoot, file),
        source,
        code,
      };
    });
  });

/** Endpoints whose job is to establish a session, so they cannot require one. */
const authExchangeEndpoints = new Set([
  "auth-firebase/templates/session.ts",
  "auth-supabase/templates/callback.ts",
]);

describe("registry templates: identity is never client-controlled", () => {
  it("collected templates to scan", () => {
    expect(templates.length).toBeGreaterThan(20);
  });

  // Regression: crud-example, image-upload and file-upload read the caller's id
  // from an `x-authenticated-user` header that nothing ever set, letting any client
  // impersonate any user.
  it("never reads identity from a request header", () => {
    const offenders = templates.filter(({ code }) =>
      /headers\s*\.\s*get\(\s*["'`]x-(authenticated|user|actor|auth)/i.test(code),
    );
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });

  it("never takes an owner or actor id from the request body or query", () => {
    const offenders = templates.filter(({ code }) =>
      /(searchParams\.get\(\s*["'`](userId|ownerId|actorId)|body\.(userId|ownerId|actorId))/.test(
        code,
      ),
    );
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });

  it("requires a verified session in every mutating route handler", () => {
    const mutating = templates.filter(
      ({ code, relative }) =>
        /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/.test(code) &&
        !authExchangeEndpoints.has(relative),
    );

    // Guard the guard: if this list empties, the check silently stops working.
    expect(mutating.length).toBeGreaterThan(0);

    const unguarded = mutating.filter(({ code }) => !code.includes("requireUser("));
    expect(unguarded.map((o) => o.relative)).toEqual([]);
  });
});

describe("registry templates: authorization is not derived from writable metadata", () => {
  // Supabase user_metadata is rewritable by the user via auth.updateUser(), so a
  // role read from it is a privilege-escalation vector.
  it("never reads a role or permission from user_metadata", () => {
    const offenders = templates.filter(({ code }) =>
      /user_metadata\s*[.[]\s*["']?(role|roles|permission|permissions|isAdmin|admin)/i.test(code),
    );
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });
});

describe("registry templates: uploads validate server-side", () => {
  const uploadRoutes = templates.filter(({ relative }) =>
    /^(image-upload|file-upload)\/templates\/route\.ts$/.test(relative),
  );

  it("found the upload routes", () => {
    expect(uploadRoutes.length).toBe(2);
  });

  it("verifies file bytes rather than the browser-reported type", () => {
    for (const route of uploadRoutes) {
      // Magic-byte sniffing must be present...
      expect(route.code, route.relative).toContain("fileTypeFromBuffer");
      // ...and the client-declared type must never be the fallback for the stored
      // content type, which was a real bypass in file-upload.
      expect(route.code, route.relative).not.toMatch(
        /contentType\s*[:=]\s*[^;\n]*\?\?\s*\w+\.type/,
      );
    }
  });

  it("rate limits and randomises the storage key", () => {
    for (const route of uploadRoutes) {
      expect(route.code, route.relative).toContain("checkRateLimit");
      expect(route.code, route.relative).toContain("crypto.randomUUID()");
    }
  });

  it("does not accept SVG for image uploads", () => {
    const image = uploadRoutes.find((r) => r.module === "image-upload");
    expect(image?.code).not.toContain("image/svg");
  });
});

describe("registry templates: no raw SQL string building", () => {
  it("never interpolates into a SQL keyword", () => {
    const offenders = templates.filter(({ code }) =>
      /(select|insert into|update|delete from|where)\s[^\n]*\$\{/i.test(code),
    );
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });
});

describe("registry templates: no deprecated or unsafe APIs", () => {
  it("does not call the deprecated Zod error.flatten()", () => {
    const offenders = templates.filter(({ code }) => /\.flatten\(\)/.test(code));
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });

  it("uses the Next.js 16 proxy convention, not middleware", () => {
    const offenders = templates.filter(
      ({ relative, code }) =>
        relative.includes("middleware") || /export\s+(async\s+)?function\s+middleware\s*\(/.test(code),
    );
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });
});

describe("registry templates: no embedded secrets", () => {
  const secretPattern =
    /(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/;

  it("contains no credential-shaped literals", () => {
    const offenders = templates.filter(({ source }) => secretPattern.test(source));
    expect(offenders.map((o) => o.relative)).toEqual([]);
  });
});

describe("base template: security headers are actually applied", () => {
  // Regression: security.ts exported a header list that next.config.ts never used,
  // so no CSP, HSTS or nosniff was ever sent.
  const nextConfig = readFileSync(path.join(baseTemplate, "next.config.ts"), "utf8");
  const securityConfig = readFileSync(path.join(baseTemplate, "src/config/security.ts"), "utf8");

  it("wires securityHeaders into next.config.ts headers()", () => {
    expect(nextConfig).toMatch(/async\s+headers\s*\(/);
    // Asserting the mention alone is too weak: the import can remain while the
    // headers() body returns nothing, which is precisely the shipped bug. Require
    // the list to be attached to a route entry.
    expect(nextConfig).toMatch(/headers\s*:\s*securityHeaders/);
    expect(nextConfig).toMatch(/source\s*:\s*["'`]\/:path\*/);
    // And the body must not simply return an empty array.
    expect(nextConfig).not.toMatch(/async\s+headers\s*\([^)]*\)\s*\{\s*return\s*\[\s*\]\s*;?\s*\}/);
  });

  it("sets the headers that matter", () => {
    for (const header of [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "Permissions-Policy",
    ]) {
      expect(securityConfig, header).toContain(header);
    }
  });

  it("blocks framing and object embedding in the CSP", () => {
    expect(securityConfig).toContain("frame-ancestors 'none'");
    expect(securityConfig).toContain("object-src 'none'");
  });

  it("documents the unsafe-inline tradeoff rather than hiding it", () => {
    // The baseline policy does allow inline scripts; that must stay disclosed.
    if (securityConfig.includes("'unsafe-inline'")) {
      expect(securityConfig.toLowerCase()).toMatch(/trade-?off|honest|not a complete/);
    }
  });
});

describe("base template: env example carries names only", () => {
  it("declares no values", () => {
    const envExample = readFileSync(path.join(baseTemplate, ".env.example"), "utf8");
    const withValues = envExample
      .split("\n")
      .filter((line) => !line.trim().startsWith("#") && line.includes("="))
      .filter((line) => line.split("=").slice(1).join("=").trim() !== "");
    expect(withValues).toEqual([]);
  });
});
