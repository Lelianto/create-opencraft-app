#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import * as p from "@clack/prompts";
import { createTwoFilesPatch } from "diff";
import { addModules, doctor, initProject, printPlan } from "./index.js";
import {
  filesForArchitecture,
  loadRegistry,
  planInstall,
  replacePlaceholders,
} from "@antihero/registry";
import {
  architectureSchema,
  readConfig,
  writeConfigAtomic,
  type OpenCraftConfig,
} from "@antihero/config";
import { checksum, pathExists } from "@antihero/shared";

interface InitOptions {
  architecture?: string;
}

interface AddOptions {
  dryRun?: boolean;
  yes?: boolean;
  overwrite?: boolean;
  install?: boolean;
}

interface MutateOptions {
  yes?: boolean;
  dryRun?: boolean;
}

/**
 * Resolve the package version by walking up from this file until a package.json
 * is found. The compiled entrypoint lives at `dist/src/bin.js`, so the manifest
 * is two levels up — but during `vitest`/`tsx` runs it is only one. Walking is
 * resilient to both without duplicating build-layout knowledge here.
 */
function readVersion(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = path.join(directory, "package.json");
    try {
      const parsed: unknown = JSON.parse(readFileSync(candidate, "utf8"));
      if (typeof parsed === "object" && parsed !== null && "version" in parsed) {
        const { version } = parsed as { version?: unknown };
        if (typeof version === "string") return version;
      }
    } catch {
      // Keep walking upwards.
    }
    directory = path.dirname(directory);
  }
  return "0.0.0";
}

/** Turn a missing-config error into an actionable message. */
async function requireConfig(root: string) {
  try {
    return await readConfig(root);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    if (detail.includes("ENOENT")) {
      throw new Error(
        "No opencraft.config.json found in this directory. Run `opencraft init` first, or cd into your OpenCraft project.",
        { cause: error },
      );
    }
    throw new Error(`Could not read opencraft.config.json: ${detail}`, { cause: error });
  }
}

const program = new Command()
  .name("opencraft")
  .description("Modular Next.js project generator CLI")
  .version(readVersion());

program
  .command("init")
  .description("Initialize OpenCraft configuration in an existing Next.js project")
  .option(
    "--architecture <architecture>",
    "Component architecture (feature, atomic, or hybrid)",
    "hybrid",
  )
  .action(async (options: InitOptions) => {
    const architecture = architectureSchema.parse(options.architecture);
    await initProject(process.cwd(), architecture);
    console.log(`OpenCraft initialized with the '${architecture}' architecture.`);
    console.log("Next: opencraft add input-validation");
  });

program
  .command("add")
  .description("Add a module to the current project")
  .argument("<module>", "Module name to add")
  .option("--dry-run", "Preview changes without modifying files")
  .option("--yes", "Skip prompts and accept the planned changes")
  .option("--overwrite", "Allow overwriting files you have customised")
  .option("--no-install", "Skip package dependency installation")
  .action(async (name: string, options: AddOptions) => {
    const root = process.cwd();
    await requireConfig(root);

    const plan = await addModules(root, [name], { ...options, dryRun: true });

    if (!plan.modules.length) {
      console.log(`Module '${name}' is already installed.`);
      if (plan.alreadyInstalled.length > 1) {
        console.log(`Also already present: ${plan.alreadyInstalled.join(", ")}`);
      }
      console.log(`Inspect local changes with: opencraft diff ${name}`);
      console.log(`Re-apply the registry version with: opencraft update ${name}`);
      return;
    }

    console.log(printPlan(plan));

    if (options.dryRun) {
      console.log("\nDry run: nothing was written.");
      return;
    }

    if (!options.yes) {
      const confirmed = await p.confirm({ message: `Apply these changes for '${name}'?` });
      if (p.isCancel(confirmed) || !confirmed) {
        console.log("Aborted.");
        return;
      }
    }

    const applied = await addModules(root, [name], options);
    console.log(`\nInstalled: ${applied.modules.map((item) => item.manifest.name).join(", ")}`);
    if (applied.instructions.length) {
      console.log("\nManual setup still required:");
      applied.instructions.forEach((line) => console.log(`  - ${line}`));
    }
  });

program
  .command("list")
  .description("List all available registry modules and their installation status")
  .option("--json", "Emit machine-readable JSON (for AI agents)")
  .action(async (options: { json?: boolean }) => {
    const config = await requireConfig(process.cwd());
    const registry = await loadRegistry();

    const rows = [...registry.values()]
      .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
      .map((item) => {
        const installed = config.modules[item.manifest.name];
        const registryVersion = item.manifest.version;

        if (!installed) {
          return {
            mark: "○",
            name: item.manifest.name,
            local: "-",
            registry: registryVersion,
            status: "available",
          };
        }
        return {
          mark: "✓",
          name: item.manifest.name,
          local: installed.version,
          registry: registryVersion,
          status: installed.version === registryVersion ? "up to date" : "update available",
        };
      });

    if (options.json) {
      const detail = [...registry.values()]
        .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
        .map((item) => {
          const installed = config.modules[item.manifest.name];
          return {
            name: item.manifest.name,
            version: item.manifest.version,
            description: item.manifest.description,
            status: installed
              ? installed.version === item.manifest.version
                ? "installed"
                : "update available"
              : "available",
            architecture: item.manifest.supportedArchitectures,
            backends: item.manifest.supportedBackends ?? ["any"],
            dependencies: item.manifest.dependencies,
            lifecycle: item.manifest.governance.lifecycle,
            exports: item.manifest.exports.map((entry) => ({
              name: entry.name,
              path: replacePlaceholders(entry.path, config),
              description: entry.description ?? "",
            })),
          };
        });
      console.log(JSON.stringify(detail, null, 2));
      return;
    }

    const width = Math.max(...rows.map((row) => row.name.length), 4);
    console.log(`  ${"MODULE".padEnd(width)}  LOCAL     REGISTRY  STATUS`);
    for (const row of rows) {
      console.log(
        `${row.mark} ${row.name.padEnd(width)}  ${row.local.padEnd(8)}  ${row.registry.padEnd(8)}  ${row.status}`,
      );
    }
  });

program
  .command("info")
  .description("Show detailed information about a registry module")
  .argument("<module>", "Module name")
  .action(async (name: string) => {
    const registry = await loadRegistry();
    const item = registry.get(name);
    if (!item) {
      throw new Error(`Unknown module: ${name}. Run \`opencraft list\` to see what is available.`);
    }

    const { manifest } = item;
    console.log(`${manifest.name} ${manifest.version}`);
    console.log(manifest.description);
    console.log("");
    console.log(`Architectures:    ${manifest.supportedArchitectures.join(", ")}`);
    console.log(`Backends:         ${manifest.supportedBackends?.join(", ") ?? "any"}`);
    console.log(`Module deps:      ${manifest.dependencies.join(", ") || "none"}`);
    console.log(`Npm deps:         ${Object.keys(manifest.npmDependencies).join(", ") || "none"}`);
    console.log(
      `Npm dev deps:     ${Object.keys(manifest.npmDevDependencies).join(", ") || "none"}`,
    );
    console.log(
      `Governance:       ${manifest.governance.owner} · ${manifest.governance.classification} · ${manifest.governance.lifecycle}${manifest.governance.reviewCadence ? ` · review ${manifest.governance.reviewCadence}` : ""}`,
    );

    // Show the file layout for whichever architecture this project uses, or all
    // of them when run outside a project. Resolve `{{...}}` placeholders against
    // the project config when available so paths are directly usable.
    let architectures = manifest.supportedArchitectures;
    let configForPaths: OpenCraftConfig | undefined;
    try {
      configForPaths = await readConfig(process.cwd());
      architectures = [configForPaths.architecture];
    } catch {
      // Not inside a project; show every variant with raw placeholders.
    }

    const resolvePath = (target: string) =>
      configForPaths ? replacePlaceholders(target, configForPaths) : target;

    console.log("\nPublic API (exports):");
    if (!manifest.exports.length) console.log("  none");
    for (const entry of manifest.exports) {
      console.log(
        `  ${entry.name} — ${resolvePath(entry.path)}${entry.description ? ` (${entry.description})` : ""}`,
      );
    }

    console.log("\nEnvironment variables:");
    if (!manifest.environmentVariables.length) console.log("  none");
    for (const variable of manifest.environmentVariables) {
      console.log(
        `  ${variable.name}${variable.required ? " (required)" : ""} — ${variable.description}`,
      );
    }

    for (const architecture of architectures) {
      console.log(`\nFiles (${architecture}):`);
      const entries = filesForArchitecture(manifest, architecture);
      if (!entries.length) console.log("  none");
      for (const entry of entries) {
        const condition = entry.when
          ? ` [only when ${JSON.stringify(entry.when).replace(/["{}]/g, "")}]`
          : "";
        console.log(`  ${resolvePath(entry.target)}${condition}`);
      }
    }

    if (manifest.instructions.length) {
      console.log("\nManual setup:");
      manifest.instructions.forEach((line) => console.log(`  - ${line}`));
    }
  });

program
  .command("doctor")
  .description(
    "Diagnose current project configuration, missing files, and environment requirements",
  )
  .action(async () => {
    const issues = await doctor(process.cwd());
    if (!issues.length) {
      console.log("✓ No issues found.");
      return;
    }
    issues.forEach((issue) => console.error(`! ${issue}`));
    console.error(`\n${issues.length} issue(s) found.`);
    process.exitCode = 1;
  });

program
  .command("diff")
  .description("Compare installed module files against the original registry templates")
  .argument("<module>", "Module name")
  .action(async (name: string) => {
    const root = process.cwd();
    const config = await requireConfig(root);
    const registry = await loadRegistry();
    if (!registry.has(name)) throw new Error(`Unknown module: ${name}`);

    // Plan against an empty module set so every file is reported, whether or not
    // the module is currently recorded as installed.
    const plan = await planInstall(root, [name], { ...config, modules: {} }, registry);
    let customised = 0;

    for (const file of plan.files) {
      const relative = path.relative(root, file.target);
      const current = (await pathExists(file.target))
        ? await fs.readFile(file.target, "utf8")
        : null;

      if (current === null) {
        console.log(`missing     ${relative}`);
        continue;
      }
      if (checksum(current) === file.checksum) {
        console.log(`unchanged   ${relative}`);
        continue;
      }

      customised += 1;
      console.log(`customised  ${relative}`);
      const patch = createTwoFilesPatch(
        `registry/${relative}`,
        `local/${relative}`,
        file.content,
        current,
        undefined,
        undefined,
        { context: 3 },
      );
      console.log(
        patch
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      );
    }

    if (customised) {
      console.log(
        `\n${customised} file(s) differ from the registry. This is expected once you edit generated code —`,
      );
      console.log("`opencraft update` will not overwrite them without --overwrite.");
    }
  });

program
  .command("update")
  .description("Re-apply the registry version of a module whose files you have not modified")
  .argument("<module>", "Module name")
  .option("--yes", "Skip prompts")
  .option("--dry-run", "Preview without writing")
  .action(async (name: string, options: MutateOptions) => {
    const root = process.cwd();
    const config = await requireConfig(root);
    const installed = config.modules[name];
    if (!installed) throw new Error(`${name} is not installed. Use \`opencraft add ${name}\`.`);

    // MVP limitation: refuse to touch anything the user has edited. Documented
    // in the README under "Update and conflict handling".
    for (const [file, expected] of Object.entries(installed.files)) {
      const target = path.join(root, file);
      if (!(await pathExists(target))) {
        throw new Error(
          `Safe update stopped: ${file} is missing. Restore it or remove the module.`,
        );
      }
      if (checksum(await fs.readFile(target, "utf8")) !== expected) {
        throw new Error(
          `Safe update stopped: you have customised ${file}. Review it with \`opencraft diff ${name}\`, then re-apply manually.`,
        );
      }
    }

    if (options.dryRun) {
      console.log(`'${name}' is unmodified and can be safely updated.`);
      return;
    }
    if (!options.yes) {
      const confirmed = await p.confirm({ message: `Re-apply registry files for '${name}'?` });
      if (p.isCancel(confirmed) || !confirmed) {
        console.log("Aborted.");
        return;
      }
    }

    // Write files BEFORE mutating config, so a mid-flight failure cannot leave
    // the config claiming the module is absent while its files remain on disk.
    const registry = await loadRegistry();
    const plan = await planInstall(root, [name], { ...config, modules: {} }, registry);
    for (const file of plan.files) {
      await fs.mkdir(path.dirname(file.target), { recursive: true });
      await fs.writeFile(file.target, file.content);
    }

    const manifest = registry.get(name)!.manifest;
    const next = {
      ...config,
      modules: {
        ...config.modules,
        [name]: {
          version: manifest.version,
          files: Object.fromEntries(
            plan.files.map((file) => [path.relative(root, file.target), file.checksum]),
          ),
        },
      },
    };
    await writeConfigAtomic(root, next);
    console.log(`Updated '${name}' to ${manifest.version}.`);
  });

program
  .command("remove")
  .description("Remove an installed module and its unmodified files")
  .argument("<module>", "Module name")
  .option("--yes", "Skip confirmation prompt")
  .option("--dry-run", "Show what would be removed")
  .action(async (name: string, options: MutateOptions) => {
    const root = process.cwd();
    const config = await requireConfig(root);
    const installed = config.modules[name];
    if (!installed) throw new Error(`${name} is not installed.`);

    const registry = await loadRegistry();
    const dependants = Object.keys(config.modules).filter((other) =>
      registry.get(other)?.manifest.dependencies.includes(name),
    );
    if (dependants.length) {
      throw new Error(
        `Cannot remove '${name}': it is required by ${dependants.join(", ")}. Remove those first.`,
      );
    }

    const customised: string[] = [];
    const removable: string[] = [];
    for (const [file, expected] of Object.entries(installed.files)) {
      const target = path.join(root, file);
      if (!(await pathExists(target))) continue;
      if (checksum(await fs.readFile(target, "utf8")) !== expected) customised.push(file);
      else removable.push(file);
    }

    if (customised.length) {
      throw new Error(
        `Refusing to remove files you have customised:\n${customised.map((file) => `  ${file}`).join("\n")}\nDelete them yourself, then re-run.`,
      );
    }

    console.log(`Files to delete:\n${removable.map((file) => `  ${file}`).join("\n") || "  none"}`);
    console.log(
      "\nPackage dependencies are retained because other modules or your own code may use them.",
    );

    if (options.dryRun) {
      console.log("\nDry run: nothing was removed.");
      return;
    }
    if (!options.yes) {
      const confirmed = await p.confirm({ message: `Remove '${name}'?` });
      if (p.isCancel(confirmed) || !confirmed) {
        console.log("Aborted.");
        return;
      }
    }

    for (const file of removable) {
      await fs.unlink(path.join(root, file)).catch(() => undefined);
    }

    const next = { ...config, modules: { ...config.modules } };
    delete next.modules[name];
    await writeConfigAtomic(root, next);
    console.log(`Removed '${name}'.`);
  });

program.showHelpAfterError("(add --help for usage)");

program.parseAsync().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : "Unexpected error"}`);
  process.exitCode = 1;
});
