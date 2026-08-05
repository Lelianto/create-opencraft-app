import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PackageManager } from "@antihero/config";

export const checksum = (content: string | Uint8Array): string =>
  createHash("sha256").update(content).digest("hex");
export async function fileChecksum(file: string): Promise<string | null> {
  try {
    return checksum(await fs.readFile(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
export async function detectPackageManager(root: string): Promise<PackageManager> {
  for (const [file, manager] of [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
    ["package-lock.json", "npm"],
  ] as const) {
    try {
      await fs.access(path.join(root, file));
      return manager;
    } catch {
      /* continue */
    }
  }
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("bun")) return "bun";
  return "npm";
}
export function packageCommand(
  manager: PackageManager,
  operation: "install" | "add",
  dev = false,
): string[] {
  if (operation === "install") return manager === "yarn" ? ["yarn"] : [manager, "install"];
  return manager === "npm"
    ? ["npm", "install", ...(dev ? ["--save-dev"] : [])]
    : [manager, "add", ...(dev ? ["-D"] : [])];
}
export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
