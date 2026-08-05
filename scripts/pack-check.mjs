// Dry-run `npm pack` for every publishable package and verify the tarball
// contains only whitelisted files and no obvious secrets.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesRoot = path.join(root, "packages");

const packages = readdirSync(packagesRoot).filter((name) => {
  const manifestPath = path.join(packagesRoot, name, "package.json");
  if (!existsSync(manifestPath)) return false;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return !manifest.private;
});

const secretPattern = /(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (?:RSA |EC |)PRIVATE KEY-----|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/;

let failed = false;

for (const name of packages) {
  const dir = path.join(packagesRoot, name);
  const manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  console.log(`\n== ${manifest.name} ==`);

  if (!manifest.bin && !existsSync(path.join(dir, "dist/src/index.js")) && !existsSync(path.join(dir, "dist/src/index.d.ts"))) {
    console.error("  ✗ no build output (dist/src/index.js or .d.ts)");
    failed = true;
  }

  if (manifest.bin) {
    const bins = typeof manifest.bin === "string" ? [manifest.bin] : Object.values(manifest.bin);
    for (const bin of bins) {
      const binPath = path.join(dir, bin);
      if (!existsSync(binPath)) {
        console.error(`  ✗ bin "${bin}" does not exist`);
        failed = true;
      } else {
        const head = readFileSync(binPath, "utf8").split("\n")[0];
        if (!head.startsWith("#!")) console.warn(`  ! bin "${bin}" is missing a shebang`);
      }
    }
  }

  if (manifest.files && manifest.files.length === 0) {
    console.error("  ✗ empty files whitelist");
    failed = true;
  }

  const json = JSON.stringify(manifest);
  if (secretPattern.test(json)) {
    console.error("  ✗ package.json contains a possible secret");
    failed = true;
  }

  try {
    const output = execSync("npm pack --dry-run --json", { cwd: dir, encoding: "utf8" });
    const result = JSON.parse(output)[0];
    if (!result || result.error) {
      console.error(`  ✗ npm pack --dry-run failed: ${result?.error ?? "unknown"}`);
      failed = true;
      continue;
    }
    console.log(`  ✓ pack contains ${result.files?.length ?? result.fileCount ?? "?"} files, ${result.size} bytes`);

    // Scan packed files for secrets.
    const dirsToScan = (manifest.files ?? []).filter((entry) => existsSync(path.join(dir, entry)));
    for (const entry of dirsToScan) {
      const full = path.join(dir, entry);
      const stats = statSync(full);
      if (!stats.isDirectory()) continue;
      for (const file of listFiles(full)) {
        if (file.endsWith(".map")) continue;
        const content = readFileSync(file, "utf8");
        if (secretPattern.test(content)) {
          console.error(`  ✗ possible secret in ${path.relative(dir, file)}`);
          failed = true;
        }
      }
    }
  } catch (error) {
    console.error(`  ✗ pack check failed: ${error instanceof Error ? error.message : "unknown"}`);
    failed = true;
  }
}

function listFiles(dir) {
  const output = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(full));
    else output.push(full);
  }
  return output;
}

if (failed) {
  console.error("\nPack verification FAILED.");
  process.exit(1);
}
console.log("\nPack verification passed.");
