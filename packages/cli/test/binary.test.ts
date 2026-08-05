import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binary = path.join(packageRoot, "dist/src/bin.js");

/**
 * These tests execute the real compiled entrypoint. The library-level tests in
 * integration.test.ts import functions directly and therefore cannot catch
 * failures in bin.ts itself — an earlier bug made every command crash at import
 * time while those tests stayed green.
 */
async function opencraft(args: string[], cwd: string) {
  try {
    const { stdout, stderr } = await run(process.execPath, [binary, ...args], { cwd });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: failure.code ?? 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

describe("compiled binary", () => {
  it("reports its version without crashing", async () => {
    const result = await opencraft(["--version"], packageRoot);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("prints help listing every documented command", async () => {
    const result = await opencraft(["--help"], packageRoot);
    expect(result.code).toBe(0);
    for (const command of ["init", "add", "list", "info", "doctor", "diff", "update", "remove"]) {
      expect(result.stdout).toContain(command);
    }
  });

  it("exits non-zero with an actionable message outside a project", async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "opencraft-bin-"));
    try {
      const result = await opencraft(["list"], empty);
      expect(result.code).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toMatch(/opencraft init/);
    } finally {
      await fs.rm(empty, { recursive: true, force: true });
    }
  });

  it("exits non-zero for an unknown command", async () => {
    const result = await opencraft(["definitely-not-a-command"], packageRoot);
    expect(result.code).not.toBe(0);
  });
});
