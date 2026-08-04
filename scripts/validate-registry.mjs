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
        const hasPlaceholder = /\{\{aliases\.(components|features|infrastructure|lib)\}\}|\{\{backend\}\}|\{\{storage\}\}/.test(entry.target);
        const rootFile = /^[a-zA-Z0-9._-]+\.tsx?$/.test(entry.target);
        if (!hasPlaceholder && !entry.target.startsWith("src/") && !rootFile) issues.push(`target should be a template or src/ path: ${entry.target}`);
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
