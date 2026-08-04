#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import { addModules, doctor, initProject, printPlan } from "./index.js";
import { loadRegistry, planInstall } from "@antihero/registry";
import { readConfig, writeConfigAtomic, architectureSchema } from "@antihero/config";
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

interface UpdateOptions {
  yes?: boolean;
}

interface RemoveOptions {
  yes?: boolean;
}

const program = new Command()
  .name("opencraft")
  .description("Modular Next.js project generator CLI")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize OpenCraft configuration in an existing Next.js project")
  .option("--architecture <architecture>", "Component architecture (feature, atomic, or hybrid)", "hybrid")
  .action(async (options: InitOptions) => {
    const architecture = architectureSchema.parse(options.architecture);
    await initProject(process.cwd(), architecture);
    console.log("OpenCraft initialized successfully.");
  });

program
  .command("add")
  .description("Add a module to the current project")
  .argument("<module>", "Module name to add")
  .option("--dry-run", "Preview changes without modifying files")
  .option("--yes", "Skip prompts and confirm overwrite/installations")
  .option("--overwrite", "Force overwrite of modified files")
  .option("--no-install", "Skip package dependency installation")
  .action(async (name: string, options: AddOptions) => {
    const plan = await addModules(process.cwd(), [name], {
      dryRun: options.dryRun,
      yes: options.yes,
      overwrite: options.overwrite,
      install: options.install,
    });
    console.log(printPlan(plan));
    if (options.dryRun) return;
    console.log(`Module '${name}' installed successfully.`);
  });

program
  .command("list")
  .description("List all available registry modules and their installation status")
  .action(async () => {
    const config = await readConfig(process.cwd());
    const registry = await loadRegistry();
    for (const item of registry.values()) {
      const isInstalled = Boolean(config.modules[item.manifest.name]);
      console.log(`${isInstalled ? "✓" : "○"} ${item.manifest.name} ${item.manifest.version}`);
    }
  });

program
  .command("info")
  .description("Show detailed information about a registry module")
  .argument("<module>", "Module name")
  .action(async (name: string) => {
    const registry = await loadRegistry();
    const item = registry.get(name);
    if (!item) throw new Error(`Unknown module: ${name}`);
    console.log(`${item.manifest.name} ${item.manifest.version}`);
    console.log(item.manifest.description);
    console.log(`Dependencies: ${item.manifest.dependencies.join(", ") || "none"}`);
    console.log(`Npm Packages: ${Object.keys(item.manifest.npmDependencies).join(", ") || "none"}`);
    console.log(`Environment Variables: ${item.manifest.environmentVariables.map((x) => x.name).join(", ") || "none"}`);
  });

program
  .command("doctor")
  .description("Diagnose current project configuration, missing files, and environment requirements")
  .action(async () => {
    const issues = await doctor(process.cwd());
    if (!issues.length) {
      console.log("✓ No issues found.");
      return;
    }
    issues.forEach((issue) => console.error(`! ${issue}`));
    process.exitCode = 1;
  });

program
  .command("diff")
  .description("Compare installed module files against original registry templates")
  .argument("<module>", "Module name")
  .action(async (name: string) => {
    const root = process.cwd();
    const config = await readConfig(root);
    const registry = await loadRegistry();
    const plan = await planInstall(root, [name], { ...config, modules: {} }, registry);
    for (const file of plan.files) {
      const current = (await pathExists(file.target)) ? await fs.readFile(file.target, "utf8") : null;
      const statusStr = current === null ? "missing" : checksum(current) === file.checksum ? "unchanged" : "customized";
      console.log(`${statusStr} ${path.relative(root, file.target)}`);
    }
  });

program
  .command("update")
  .description("Safely update an unmodified installed module to its latest registry version")
  .argument("<module>", "Module name")
  .option("--yes", "Skip prompts")
  .action(async (name: string, options: UpdateOptions) => {
    const root = process.cwd();
    const config = await readConfig(root);
    const installed = config.modules[name];
    if (!installed) throw new Error(`${name} is not installed`);
    for (const [file, expected] of Object.entries(installed.files)) {
      const target = path.join(root, file);
      if (!(await pathExists(target)) || checksum(await fs.readFile(target, "utf8")) !== expected) {
        throw new Error(`Safe update stopped: ${file} was modified or removed`);
      }
    }
    const next = { ...config, modules: { ...config.modules } };
    delete next.modules[name];
    await writeConfigAtomic(root, next);
    const plan = await addModules(root, [name], { yes: options.yes, overwrite: true, install: true });
    console.log(printPlan(plan));
  });

program
  .command("remove")
  .description("Remove an installed module and its unmodified files")
  .argument("<module>", "Module name")
  .option("--yes", "Skip confirmation prompt")
  .action(async (name: string, options: RemoveOptions) => {
    const root = process.cwd();
    const config = await readConfig(root);
    const installed = config.modules[name];
    if (!installed) throw new Error(`${name} is not installed`);

    const registry = await loadRegistry();
    const dependants = Object.keys(config.modules).filter((other) =>
      registry.get(other)?.manifest.dependencies.includes(name)
    );
    if (dependants.length) throw new Error(`Cannot remove ${name}: required by ${dependants.join(", ")}`);

    for (const [file, expected] of Object.entries(installed.files)) {
      const target = path.join(root, file);
      if ((await pathExists(target)) && checksum(await fs.readFile(target, "utf8")) !== expected) {
        throw new Error(`Refusing to remove customized file: ${file}`);
      }
    }

    if (!options.yes) {
      const confirmed = await p.confirm({ message: `Remove ${name} and its unchanged files?` });
      if (p.isCancel(confirmed) || !confirmed) return;
    }

    for (const file of Object.keys(installed.files)) {
      await fs.unlink(path.join(root, file)).catch(() => undefined);
    }
    const next = { ...config, modules: { ...config.modules } };
    delete next.modules[name];
    await writeConfigAtomic(root, next);
    console.log(`Removed ${name}. Package dependencies were retained because they may be shared.`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected error");
  process.exitCode = 1;
});
