import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProject, addModules, doctor, printPlan, validateChoices } from "../src/index.js";
import { readConfig } from "@antihero/config";

const tempRoots: string[] = [];
let workingRoot: string;

async function tempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "opencraft-int-"));
  tempRoots.push(dir);
  return dir;
}

beforeEach(async () => {
  workingRoot = await tempDir();
});

afterEach(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("createProject", () => {
  it("creates a hybrid Supabase project with modules", async () => {
    const { files, plan } = await createProject({
      projectName: "test-app",
      directory: path.join(workingRoot, "test-app"),
      architecture: "hybrid",
      backend: "supabase",
      auth: "google",
      storage: "vercel-blob",
      modules: ["image-upload", "dashboard"],
      packageManager: "pnpm",
      install: false,
      git: false,
      dryRun: false,
      yes: true,
    });

    expect(files.length).toBeGreaterThan(0);
    const appRoot = path.join(workingRoot, "test-app");
    const config = await readConfig(appRoot);

    expect(config.architecture).toBe("hybrid");
    expect(config.backend.provider).toBe("supabase");
    expect(config.authentication.methods).toEqual(["google"]);
    expect(config.storage.provider).toBe("vercel-blob");
    expect(config.modules["image-upload"]).toBeDefined();
    expect(config.modules["storage-vercel-blob"]).toBeDefined();
    expect(config.modules["dashboard"]).toBeDefined();

    expect(
      await fs
        .access(path.join(appRoot, "AGENTS.md"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(path.join(appRoot, "src/infrastructure/auth.ts"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(path.join(appRoot, "src/infrastructure/storage.ts"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(path.join(appRoot, "src/app/api/uploads/images/route.ts"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(plan.modules.map((item) => item.manifest.name)).toContain("auth-supabase");
  });

  it("creates a feature Firebase project with modules", async () => {
    const { files, plan } = await createProject({
      projectName: "firebase-app",
      directory: path.join(workingRoot, "firebase-app"),
      architecture: "feature",
      backend: "firebase",
      auth: "google",
      storage: "firebase",
      modules: ["user-profile", "crud-example"],
      packageManager: "pnpm",
      install: false,
      git: false,
      dryRun: false,
      yes: true,
    });

    expect(files.length).toBeGreaterThan(0);
    const appRoot = path.join(workingRoot, "firebase-app");
    const config = await readConfig(appRoot);

    expect(config.architecture).toBe("feature");
    expect(config.backend.provider).toBe("firebase");
    expect(config.authentication.methods).toEqual(["google"]);
    expect(config.storage.provider).toBe("firebase");
    expect(config.modules["auth-firebase"]).toBeDefined();
    expect(config.modules["storage-firebase"]).toBeDefined();
    expect(config.modules["crud-example"]).toBeDefined();

    expect(
      await fs
        .access(path.join(appRoot, "AGENTS.md"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(path.join(appRoot, "src/infrastructure/auth.ts"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(path.join(appRoot, "src/infrastructure/storage.ts"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(plan.modules.map((item) => item.manifest.name)).toContain("auth-firebase");
  });

  it("creates a project without a backend and without storage", async () => {
    const appRoot = path.join(workingRoot, "plain-app");
    await createProject({
      projectName: "plain-app",
      directory: appRoot,
      architecture: "feature",
      backend: "none",
      auth: "none",
      storage: "none",
      modules: ["dashboard"],
      packageManager: "npm",
      install: false,
      git: false,
      dryRun: false,
      yes: true,
    });
    const config = await readConfig(appRoot);
    expect(config.backend.provider).toBe("none");
    expect(config.authentication.methods).toEqual([]);
    expect(Object.keys(config.modules)).toEqual(["dashboard"]);
    expect(
      await fs
        .access(path.join(appRoot, "src/features"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
  });

  it("supports atomic architecture directories", async () => {
    const appRoot = path.join(workingRoot, "atomic-app");
    await createProject({
      projectName: "atomic-app",
      directory: appRoot,
      architecture: "atomic",
      backend: "none",
      auth: "none",
      storage: "none",
      modules: [],
      packageManager: "pnpm",
      install: false,
      git: false,
      dryRun: false,
      yes: true,
    });
    expect(
      await fs
        .access(path.join(appRoot, "src/components/atoms"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(path.join(appRoot, "src/components/molecules"))
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
  });

  it("dry run writes nothing", async () => {
    const appRoot = path.join(workingRoot, "dry-app");
    const result = await createProject({
      projectName: "dry-app",
      directory: appRoot,
      architecture: "hybrid",
      backend: "supabase",
      auth: "google",
      storage: "vercel-blob",
      modules: ["image-upload"],
      packageManager: "pnpm",
      install: false,
      git: false,
      dryRun: true,
      yes: true,
    });
    expect(result.files).toEqual([]);
    expect(result.plan.files.length).toBeGreaterThan(0);
    expect(
      await fs
        .access(appRoot)
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
  });

  it("rejects invalid combinations", () => {
    expect(() =>
      validateChoices({ backend: "none", auth: "google", storage: "none", modules: [] }),
    ).toThrow(/requires Supabase or Firebase/);
    expect(() =>
      validateChoices({ backend: "supabase", auth: "none", storage: "firebase", modules: [] }),
    ).toThrow(/requires the Firebase backend/);
    expect(() =>
      validateChoices({
        backend: "supabase",
        auth: "none",
        storage: "none",
        modules: ["image-upload"],
      }),
    ).toThrow(/requires a storage provider/);
  });
});

describe("addModules lifecycle", () => {
  async function seed(): Promise<string> {
    const appRoot = path.join(workingRoot, "lifecycle-app");
    await createProject({
      projectName: "lifecycle-app",
      directory: appRoot,
      architecture: "hybrid",
      backend: "supabase",
      auth: "google",
      storage: "vercel-blob",
      modules: [],
      packageManager: "pnpm",
      install: false,
      git: false,
      dryRun: false,
      yes: true,
    });
    return appRoot;
  }

  it("is idempotent: re-adding a module does not duplicate files", async () => {
    const appRoot = await seed();
    const first = await addModules(appRoot, ["confirmation-dialog"], { yes: true });
    expect(first.files.some((file) => file.status === "create")).toBe(true);
    const config = await readConfig(appRoot);
    expect(config.modules["confirmation-dialog"]).toBeDefined();

    const second = await addModules(appRoot, ["confirmation-dialog"], { yes: true });
    expect(second.modules).toEqual([]);
    expect(second.files.filter((file) => file.status === "create")).toEqual([]);
    const after = await readConfig(appRoot);
    expect(
      Object.keys(after.modules).filter((name) => name === "confirmation-dialog"),
    ).toHaveLength(1);
  });

  it("resolves transitive module dependencies", async () => {
    const appRoot = await seed();
    const plan = await addModules(appRoot, ["crud-example"], { yes: true });
    const names = plan.modules.map((item) => item.manifest.name);
    expect(names).toContain("input-validation");
    expect(names).toContain("api-response");
    expect(names).toContain("confirmation-dialog");
  });

  it("refuses to silently overwrite a modified file", async () => {
    const appRoot = await seed();
    const target = path.join(appRoot, "src/lib/validation.ts");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "export const custom = true;\n");
    await expect(addModules(appRoot, ["input-validation"], {})).rejects.toThrow(/customised/i);
    expect(await fs.readFile(target, "utf8")).toContain("custom");
  });

  it("doctor reports missing environment variables", async () => {
    const appRoot = await seed();
    await addModules(appRoot, ["auth-supabase"], { yes: true });
    const issues = await doctor(appRoot);
    expect(issues.some((issue) => issue.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(true);
  });
});

describe("printPlan", () => {
  it("renders a readable summary", async () => {
    const appRoot = path.join(workingRoot, "plan-app");
    const result = await createProject({
      projectName: "plan-app",
      directory: appRoot,
      architecture: "hybrid",
      backend: "supabase",
      auth: "google",
      storage: "vercel-blob",
      modules: ["dashboard"],
      packageManager: "pnpm",
      install: false,
      git: false,
      dryRun: true,
      yes: true,
    });
    const text = printPlan(result.plan);
    expect(text).toContain("Modules:");
    expect(text).toContain("Files:");
    expect(text).toContain("dashboard");
  });
});
