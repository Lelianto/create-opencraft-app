// Renames the internal npm scope used by OpenCraft packages, e.g.:
//
//   node scripts/rename-scope.mjs my-scope
//
// Rewrites package.json "name" fields, workspace dependency specifiers, and
// import specifiers across packages and root config. It does not touch templates
// or registry module manifests (they use "@/" aliases, not the npm scope).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Auto-detect current scope from packages/config/package.json
const configPkgPath = path.join(root, "packages/config/package.json");
let detectedScope = "@opencraft";
if (existsSync(configPkgPath)) {
  try {
    const pkgJson = JSON.parse(readFileSync(configPkgPath, "utf8"));
    const match = /^(@[^/]+)\//.exec(pkgJson.name ?? "");
    if (match) detectedScope = match[1];
  } catch {}
}

const oldScope = process.argv[3] ? `@${process.argv[3].replace(/^@/, "")}` : detectedScope;
const newScope = process.argv[2] ? `@${process.argv[2].replace(/^@/, "")}` : null;

if (!newScope || !/^@[a-z0-9-]+$/.test(newScope)) {
  console.error(`Usage: node scripts/rename-scope.mjs <new-scope> [old-scope]\nExample: node scripts/rename-scope.mjs antihero`);
  process.exit(1);
}

const packagesRoot = path.join(root, "packages");

function collectJsonFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJsonFiles(full));
    else if (entry.name.endsWith(".json") && (entry.name === "package.json" || entry.name === "tsconfig.json")) files.push(full);
  }
  return files;
}

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".mts")) files.push(full);
  }
  return files;
}

const targets = [
  path.join(root, "package.json"),
  ...collectJsonFiles(packagesRoot),
  ...collectSourceFiles(packagesRoot),
];

let changed = 0;
for (const file of targets) {
  if (!existsSync(file)) continue;
  const original = readFileSync(file, "utf8");
  const next = original.replaceAll(oldScope, newScope);
  if (next !== original) {
    writeFileSync(file, next);
    changed++;
    console.log(`updated ${path.relative(root, file)}`);
  }
}

console.log(`\nReplaced "${oldScope}" with "${newScope}" across ${changed} files.`);
console.log("Remember to update changeset config, CI, and any documentation that mentions the old scope.");
