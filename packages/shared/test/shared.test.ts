import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checksum, detectPackageManager, fileChecksum, packageCommand, pathExists } from "../src/index.js";

describe("shared", () => {
  it("hashes deterministically", () => expect(checksum("x")).toBe(checksum("x")));
  it("uses npm install", () => expect(packageCommand("npm", "add")).toEqual(["npm", "install"]));
  it("adds dev flags per manager", () => {
    expect(packageCommand("npm", "add", true)).toEqual(["npm", "install", "--save-dev"]);
    expect(packageCommand("pnpm", "add", true)).toEqual(["pnpm", "add", "-D"]);
    expect(packageCommand("bun", "add")).toEqual(["bun", "add"]);
    expect(packageCommand("yarn", "install")).toEqual(["yarn"]);
  });

  it("detects package managers by lockfile", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "shared-pm-"));
    const write = (name: string) => fs.writeFile(path.join(dir, name), "");
    const clear = () => fs.rm(path.join(dir, "package-lock.json"), { force: true }).then(() => fs.rm(path.join(dir, "pnpm-lock.yaml"), { force: true })).then(() => fs.rm(path.join(dir, "bun.lockb"), { force: true })).then(() => fs.rm(path.join(dir, "yarn.lock"), { force: true }));
    try {
      await write("package-lock.json");
      expect(await detectPackageManager(dir)).toBe("npm");
      await clear();
      await write("pnpm-lock.yaml");
      expect(await detectPackageManager(dir)).toBe("pnpm");
      await clear();
      await write("bun.lockb");
      expect(await detectPackageManager(dir)).toBe("bun");
      await clear();
      await write("yarn.lock");
      expect(await detectPackageManager(dir)).toBe("yarn");
      await clear();
      expect(["npm", "pnpm", "yarn", "bun"]).toContain(await detectPackageManager(dir));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("computes and compares file checksums", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "shared-hash-"));
    try {
      const file = path.join(dir, "a.txt");
      await fs.writeFile(file, "hello");
      expect(await fileChecksum(file)).toBe(checksum("hello"));
      expect(await fileChecksum(path.join(dir, "missing.txt"))).toBeNull();
      expect(await pathExists(file)).toBe(true);
      expect(await pathExists(path.join(dir, "missing.txt"))).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});