#!/usr/bin/env node
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import * as p from "@clack/prompts";
import { z } from "zod";
import { createProject, printPlan, type CreateOptions } from "@antihero/cli";
import {
  architectureSchema,
  backendSchema,
  packageManagerSchema,
  storageSchema,
} from "@antihero/config";
import { detectPackageManager } from "@antihero/shared";

const authSchema = z.enum(["none", "google"]);

interface CreateFlags {
  architecture?: string;
  backend?: string;
  auth?: string;
  storage?: string;
  modules?: string;
  packageManager?: string;
  dryRun?: boolean;
  yes?: boolean;
  install?: boolean;
  git?: boolean;
}

/** Read the version from this package's own manifest rather than hardcoding it. */
function readVersion(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    try {
      const parsed: unknown = JSON.parse(
        readFileSync(path.join(directory, "package.json"), "utf8"),
      );
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

const program = new Command()
  .name("create-opencraft-app")
  .description("Create a new OpenCraft Next.js application")
  .version(readVersion())
  .argument("[project-name]")
  .option("--architecture <value>", "Component architecture (hybrid, feature, atomic)")
  .option("--backend <value>", "Backend provider (none, supabase, firebase)")
  .option("--auth <value>", "Authentication provider (none, google)")
  .option("--storage <value>", "Storage provider (none, vercel-blob, supabase, firebase)")
  .option("--modules <list>", "Comma-separated list of initial modules")
  .option("--package-manager <value>", "Package manager (pnpm, npm, yarn, bun)")
  .option("--dry-run", "Preview changes without writing files")
  .option("--yes", "Skip interactive prompts and use defaults")
  .option("--no-install", "Skip installing dependencies")
  .option("--no-git", "Skip initializing git repository");

/**
 * npm package names must be lowercase and URL-safe. The name is written into the
 * generated package.json, so an invalid value only surfaces later as a confusing
 * install failure — validate it up front, for flags as well as prompts.
 */
const projectNamePattern = /^[a-z0-9][a-z0-9._-]*$/;

function assertValidProjectName(value: string): string {
  if (!projectNamePattern.test(value)) {
    throw new Error(
      `Invalid project name: "${value}". Use lowercase letters, numbers, hyphens, dots, or underscores, starting with a letter or number. Pass a bare name — run the command from the directory where you want the project created.`,
    );
  }
  return value;
}

program.action(async (projectNameArg: string | undefined, flags: CreateFlags) => {
  p.intro("OpenCraft");

  const ask = async <T>(value: T | undefined, promptFn: () => Promise<T | symbol>): Promise<T> => {
    if (value !== undefined) return value;
    const answer = await promptFn();
    if (p.isCancel(answer)) {
      p.cancel("Cancelled");
      process.exit(0);
    }
    return answer;
  };

  const rawName = await ask<string>(projectNameArg, () =>
    p.text({
      message: "Project name?",
      placeholder: "my-app",
      validate: (val) =>
        projectNamePattern.test(val ?? "")
          ? undefined
          : "Use lowercase letters, numbers, and hyphens",
    }),
  );

  // Applies to the --yes / argument path too, not just the prompt.
  const name = assertValidProjectName(rawName);

  const defaultPm = await detectPackageManager(process.cwd());
  const pmInput = await ask<string>(flags.packageManager, async () =>
    p.select({
      message: "Package manager?",
      options: ["pnpm", "npm", "yarn", "bun"].map((val) => ({ value: val, label: val })),
      initialValue: defaultPm,
    }),
  );
  const packageManager = packageManagerSchema.parse(pmInput);

  const archInput = await ask<string>(flags.architecture, () =>
    p.select({
      message: "Component architecture?",
      options: [
        { value: "hybrid", label: "Hybrid" },
        { value: "feature", label: "Feature-based" },
        { value: "atomic", label: "Atomic Design" },
      ],
    }),
  );
  const architecture = architectureSchema.parse(archInput);

  const backendInput = await ask<string>(flags.backend, () =>
    p.select({
      message: "Backend?",
      options: ["none", "supabase", "firebase"].map((val) => ({ value: val, label: val })),
    }),
  );
  const backend = backendSchema.parse(backendInput);

  const authInput = await ask<string>(flags.auth, () =>
    p.select({
      message: "Authentication?",
      options: [
        { value: "none", label: "None" },
        { value: "google", label: "Google" },
      ],
    }),
  );
  const auth = authSchema.parse(authInput);

  const storageInput = await ask<string>(flags.storage, () =>
    p.select({
      message: "Storage?",
      options: ["none", "vercel-blob", "supabase", "firebase"].map((val) => ({
        value: val,
        label: val,
      })),
    }),
  );
  const storage = storageSchema.parse(storageInput);

  let modules: string[];
  if (flags.modules) {
    modules = String(flags.modules).split(",").filter(Boolean);
  } else if (flags.yes) {
    modules = [];
  } else {
    const selected = await ask<string[] | symbol>(undefined, () =>
      p.multiselect({
        message: "Initial modules?",
        required: false,
        options: [
          "dashboard",
          "crud-example",
          "input-validation",
          "confirmation-dialog",
          "error-handling",
          "security-headers",
          "rate-limit",
          "ssrf-protection",
          "image-upload",
          "file-upload",
          "data-table",
          "pagination",
          "search-filter",
          "user-profile",
          "audit-log",
        ].map((val) => ({ value: val, label: val })),
      }),
    );
    modules = Array.isArray(selected) ? selected : [];
  }

  const options: CreateOptions = {
    projectName: name,
    directory: path.resolve(name),
    architecture,
    backend,
    auth,
    storage,
    modules,
    packageManager,
    install: flags.install ?? true,
    git: flags.git ?? true,
    dryRun: Boolean(flags.dryRun),
    yes: Boolean(flags.yes),
  };

  const result = await createProject(options);

  if (flags.dryRun) {
    console.log(printPlan(result.plan));
    p.outro("Dry run complete; nothing was written.");
    return;
  }

  p.outro(`Created ${name}. Next: cd ${name} && ${packageManager} run dev`);
});

program.parseAsync().catch((error: unknown) => {
  p.log.error(error instanceof Error ? error.message : "Unexpected error");
  process.exitCode = 1;
});
