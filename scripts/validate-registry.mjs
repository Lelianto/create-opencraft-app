// Validates the module registry on disk without dependencies.
// Checks: manifest shape, unique names, file targets exist, placeholder syntax,
// dependency resolution, and that architecture files are complete.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulesRoot = path.join(root, "registry/modules");

const architectures = ["atomic", "feature", "hybrid"];
const namePattern = /^[a-z0-9-]+$/;
const lifecycleValues = ["stable", "beta", "experimental", "deprecated"];
const classificationValues = ["core", "standard", "security", "domain"];
const ownerPattern = /^[a-z0-9][a-z0-9._-]*$/i;

function fail(module, message) {
  console.error(`✗ ${module}: ${message}`);
  process.exitCode = 1;
}

function ok(module, message) {
  console.log(`✓ ${module}: ${message}`);
}

if (!existsSync(modulesRoot)) {
  console.error("registry/modules not found");
  process.exit(1);
}

const manifests = new Map();

for (const name of readdirSync(modulesRoot)) {
  const dir = path.join(modulesRoot, name);
  if (!statSync(dir).isDirectory()) continue;
  const manifestPath = path.join(dir, "module.json");
  if (!existsSync(manifestPath)) {
    fail(name, "missing module.json");
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const issues = [];

  if (!namePattern.test(manifest.name)) issues.push("invalid name pattern");
  if (manifest.name !== name) issues.push(`manifest name "${manifest.name}" does not match directory "${name}"`);
  if (typeof manifest.version !== "string" || !manifest.version) issues.push("missing version");
  if (!Array.isArray(manifest.supportedArchitectures) || manifest.supportedArchitectures.length === 0) issues.push("missing supportedArchitectures");
  for (const architecture of manifest.supportedArchitectures) {
    if (!architectures.includes(architecture)) issues.push(`unknown architecture ${architecture}`);
  }
  if (typeof manifest.files !== "object" || manifest.files === null) issues.push("missing files");

  // `exports` — the machine-readable public API contract that `opencraft info`
  // and `list --json` surface to AI agents. Every export must name a file that
  // the module actually installs, and that file must be reachable.
  if (manifest.exports !== undefined) {
    if (!Array.isArray(manifest.exports)) issues.push("exports must be an array");
    else {
      const installedTargets = new Set(
        Object.values(manifest.files ?? {})
          .flat()
          .map((entry) => entry.target),
      );
      for (const entry of manifest.exports) {
        if (typeof entry.name !== "string" || !entry.name) issues.push("export missing name");
        if (typeof entry.path !== "string" || !entry.path) issues.push(`export "${entry.name}" missing path`);
        else if (!installedTargets.has(entry.path)) {
          issues.push(
            `export "${entry.name}" points to "${entry.path}", which is not a file this module installs`,
          );
        }
      }
    }
  }

  // `governance` — provenance + lifecycle metadata so every module answers who
  // owns it, why it exists, and how it is governed (LCDD principle 2).
  if (manifest.governance !== undefined) {
    const governance = manifest.governance;
    if (typeof governance !== "object" || governance === null) issues.push("governance must be an object");
    else {
      if (typeof governance.owner !== "string" || !ownerPattern.test(governance.owner)) {
        issues.push("governance.owner must be a non-empty owner name");
      }
      if (!lifecycleValues.includes(governance.lifecycle)) {
        issues.push(`governance.lifecycle must be one of ${lifecycleValues.join(", ")}`);
      }
      if (typeof governance.classification !== "string") {
        issues.push("governance.classification must be a string");
      } else if (!classificationValues.includes(governance.classification)) {
        issues.push(`governance.classification must be one of ${classificationValues.join(", ")}`);
      }
    }
  }


  for (const architecture of architectures) {
    const entries = manifest.files?.[architecture] ?? [];
    if (!Array.isArray(entries)) {
      issues.push(`files.${architecture} is not an array`);
      continue;
    }
    for (const entry of entries) {
      const source = path.join(dir, entry.source);
      if (!existsSync(source)) issues.push(`missing template ${entry.source} (${architecture})`);
      if (typeof entry.target !== "string") issues.push(`bad target in ${architecture}`);
      else {
        const hasPlaceholder =
          /\{\{aliases\.(components|features|infrastructure|lib)\}\}|\{\{dir\.(domain|sharedComponents)\}\}|\{\{backend\}\}|\{\{storage\}\}/.test(
            entry.target,
          );
        // A small allowlist of files that legitimately live at the project root
        // or in a provider-owned directory.
        const allowedRootTargets = new Set([
          "proxy.ts",
          "firestore.rules",
          "storage.rules",
          "firebase.json",
          "Dockerfile",
          ".dockerignore",
          "compose.yaml",
          "docker-compose.yml",
          "vercel.json",
          "docker-compose.yaml",
        ]);
        const allowedPrefixes = [
          "src/",
          "supabase/",
          "drizzle/",
          "prisma/",
          ".github/workflows/",
          "docs/",
        ];

        const isAllowed =
          hasPlaceholder ||
          allowedRootTargets.has(entry.target) ||
          allowedPrefixes.some((prefix) => entry.target.startsWith(prefix));

        if (!isAllowed) {
          issues.push(
            `target must use a placeholder, start with ${allowedPrefixes.join("/")}, or be an allowed root file: ${entry.target}`,
          );
        }
      }
    }
  }

  if (issues.length) fail(name, issues.join("; "));
  else ok(name, "manifest valid");
  manifests.set(name, manifest);
}

// Dependency resolution sanity check.
for (const [name, manifest] of manifests) {
  for (const dependency of manifest.dependencies ?? []) {
    if (!manifests.has(dependency)) fail(name, `unknown dependency "${dependency}"`);
  }
}

// Detect circular dependencies.
function hasCycle(start, visited = new Set()) {
  if (visited.has(start)) return true;
  const manifest = manifests.get(start);
  if (!manifest) return false;
  visited.add(start);
  for (const dependency of manifest.dependencies ?? []) {
    if (hasCycle(dependency, new Set(visited))) return true;
  }
  return false;
}
for (const name of manifests.keys()) {
  if (hasCycle(name)) fail(name, "circular module dependency detected");
}

const count = manifests.size;
if (process.exitCode) {
  console.error(`Registry validation failed (${count} modules scanned).`);
  process.exit(1);
}
console.log(`Registry valid: ${count} modules.`);
