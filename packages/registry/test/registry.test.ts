import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyFiles,
  manifestSchema,
  planInstall,
  replacePlaceholders,
  resolveModules,
  updateEnvExample,
  type RegistryModule,
} from "../src/index.js";
import { createDefaultConfig } from "@antihero/config";

const item = (
  name: string,
  dependencies: string[] = [],
  files: RegistryModule["manifest"]["files"] = { atomic: [], feature: [], hybrid: [] },
  directory = "/tmp",
): RegistryModule => ({
  directory,
  manifest: {
    name,
    dependencies,
    version: "1",
    description: name,
    supportedArchitectures: ["atomic", "feature", "hybrid"],
    npmDependencies: {},
    npmDevDependencies: {},
    environmentVariables: [],
    instructions: [],
    files,
    exports: [],
    governance: { owner: "opencraft", classification: "core", lifecycle: "stable" },
  },
});

describe("registry", () => {
  it("orders transitive dependencies", () => {
    const registry = new Map([
      ["a", item("a", ["b"])],
      ["b", item("b")],
    ]);
    expect(resolveModules(["a"], registry).map((x) => x.manifest.name)).toEqual(["b", "a"]);
  });

  it("finds cycles", () => {
    const registry = new Map([
      ["a", item("a", ["b"])],
      ["b", item("b", ["a"])],
    ]);
    expect(() => resolveModules(["a"], registry)).toThrow(/Circular/);
  });

  it("throws on unknown modules", () => {
    const registry = new Map<string, RegistryModule>();
    expect(() => resolveModules(["missing"], registry)).toThrow(/Unknown module/);
  });

  it("replaces paths", () => {
    const config = createDefaultConfig({
      backend: { provider: "supabase" },
      storage: { provider: "vercel-blob" },
    });
    expect(replacePlaceholders("{{aliases.features}}/x", config)).toBe("src/features/x");
    expect(replacePlaceholders("{{aliases.components}}/{{backend}}/{{storage}}", config)).toBe(
      "src/components/supabase/vercel-blob",
    );
  });

  it("resolves export paths against the project config", () => {
    const config = createDefaultConfig({ architecture: "atomic" });
    const manifest = {
      ...item("ok").manifest,
      exports: [{ name: "getRole", path: "{{aliases.lib}}/roles.ts" }],
    };
    const parsed = manifestSchema.parse(manifest);
    expect(replacePlaceholders(parsed.exports[0]!.path, config)).toBe("src/lib/roles.ts");
  });

  it("validates a manifest and rejects a bad one", () => {
    const valid = item("ok").manifest;
    expect(() => manifestSchema.parse(valid)).not.toThrow();
    expect(() => manifestSchema.parse({ ...valid, supportedArchitectures: ["bogus"] })).toThrow();
    expect(() => manifestSchema.parse({ ...valid, name: "Bad Name!" })).toThrow();
  });

  it("defaults exports and governance when absent", () => {
    const parsed = manifestSchema.parse(item("ok").manifest);
    expect(parsed.exports).toEqual([]);
    expect(parsed.governance).toMatchObject({ owner: "opencraft", classification: "core", lifecycle: "stable" });
  });

  it("accepts exports and governance metadata", () => {
    const manifest = {
      ...item("ok").manifest,
      exports: [{ name: "getRole", path: "{{aliases.lib}}/roles.ts", description: "Role check" }],
      governance: { owner: "opencraft-security", classification: "security", lifecycle: "beta" },
    };
    const parsed = manifestSchema.parse(manifest);
    expect(parsed.exports[0]?.path).toBe("{{aliases.lib}}/roles.ts");
    expect(parsed.governance.owner).toBe("opencraft-security");
    expect(parsed.governance.lifecycle).toBe("beta");
  });

  it("rejects a governance lifecycle outside the enum", () => {
    const manifest = {
      ...item("ok").manifest,
      governance: { owner: "opencraft", classification: "core", lifecycle: "banana" as never },
    };
    expect(() => manifestSchema.parse(manifest)).toThrow();
  });

  it("plans conditional files by backend and storage", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "registry-plan-"));
    try {
      const moduleDir = path.join(dir, "m");
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(path.join(moduleDir, "a.ts"), "// a");
      await fs.writeFile(path.join(moduleDir, "b.ts"), "// b");
      const manifest = item(
        "m",
        [],
        {
          atomic: [
            { source: "a.ts", target: "src/a.ts", when: { backend: ["supabase"] } },
            { source: "b.ts", target: "src/b.ts", when: { storage: ["firebase"] } },
          ],
          feature: [{ source: "a.ts", target: "src/a.ts", when: { backend: ["supabase"] } }],
          hybrid: [{ source: "a.ts", target: "src/a.ts", when: { backend: ["supabase"] } }],
        },
        moduleDir,
      );
      const registry = new Map([["m", manifest]]);
      const root = path.join(dir, "app");
      await fs.mkdir(root, { recursive: true });
      const config = createDefaultConfig({
        architecture: "atomic",
        backend: { provider: "supabase" },
        storage: { provider: "firebase" },
      });
      const plan = await planInstall(root, ["m"], config, registry);
      const targets = plan.files.map((file) => path.relative(root, file.target));
      expect(targets).toContain("src/a.ts");
      expect(targets).toContain("src/b.ts");
      expect(plan.files[0]).toMatchObject({ status: "create" });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("detects unchanged and modified files", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "registry-conflict-"));
    try {
      const moduleDir = path.join(dir, "m");
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(path.join(moduleDir, "a.ts"), "// a");
      const manifest = item(
        "m",
        [],
        { atomic: [{ source: "a.ts", target: "src/a.ts" }], feature: [], hybrid: [] },
        moduleDir,
      );
      const root = path.join(dir, "app");
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.writeFile(path.join(root, "src/a.ts"), "// a");
      const plan = await planInstall(
        root,
        ["m"],
        createDefaultConfig({ architecture: "atomic" }),
        new Map([["m", manifest]]),
      );
      expect(plan.files[0]?.status).toBe("unchanged");

      await fs.writeFile(path.join(root, "src/a.ts"), "// customized");
      const plan2 = await planInstall(
        root,
        ["m"],
        createDefaultConfig({ architecture: "atomic" }),
        new Map([["m", manifest]]),
      );
      expect(plan2.files[0]?.status).toBe("modified");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite modified files unless allowed", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "registry-apply-"));
    try {
      const moduleDir = path.join(dir, "m");
      await fs.mkdir(moduleDir, { recursive: true });
      await fs.writeFile(path.join(moduleDir, "a.ts"), "// a");
      const manifest = item(
        "m",
        [],
        { atomic: [{ source: "a.ts", target: "src/a.ts" }], feature: [], hybrid: [] },
        moduleDir,
      );
      const root = path.join(dir, "app");
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.writeFile(path.join(root, "src/a.ts"), "// customized");
      const plan = await planInstall(
        root,
        ["m"],
        createDefaultConfig({ architecture: "atomic" }),
        new Map([["m", manifest]]),
      );
      await expect(applyFiles(plan)).rejects.toThrow(/modified/i);
      await applyFiles(plan, true);
      expect(await fs.readFile(path.join(root, "src/a.ts"), "utf8")).toBe("// a");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("appends environment variables without duplicating", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "registry-env-"));
    try {
      const env = path.join(dir, ".env.example");
      await fs.writeFile(env, "EXISTING=1\n");
      await updateEnvExample(dir, ["EXISTING", "NEW_ONE", "OTHER"]);
      const content = await fs.readFile(env, "utf8");
      expect(content.split("EXISTING").length - 1).toBe(1);
      expect(content).toContain("NEW_ONE=");
      expect(content).toContain("OTHER=");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
