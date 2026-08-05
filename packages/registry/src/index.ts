import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { backendSchema, storageSchema, type Architecture, type OpenCraftConfig } from "@antihero/config";
import { checksum, pathExists } from "@antihero/shared";

const architectureEnum = z.enum(["atomic", "feature", "hybrid"]);
const authEnum = z.enum(["none", "google"]);

const fileEntrySchema = z.object({
  source: z.string(),
  target: z.string(),
  when: z
    .object({
      backend: z.array(z.string()).optional(),
      storage: z.array(z.string()).optional(),
    })
    .optional(),
});

export const manifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string(),
  description: z.string(),
  supportedArchitectures: z.array(architectureEnum),
  supportedBackends: z.array(z.enum(["none", "supabase", "firebase"])).optional(),
  dependencies: z.array(z.string()).default([]),
  npmDependencies: z.record(z.string(), z.string()).default({}),
  npmDevDependencies: z.record(z.string(), z.string()).default({}),
  environmentVariables: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        required: z.boolean().default(true),
      }),
    )
    .default([]),
  files: z.record(architectureEnum, z.array(fileEntrySchema)),
  instructions: z.array(z.string()).default([]),
});

export type ModuleManifest = z.infer<typeof manifestSchema>;
export type FileEntry = z.infer<typeof fileEntrySchema>;

export interface RegistryModule {
  manifest: ModuleManifest;
  directory: string;
}

/**
 * A named, validated combination of architecture + providers + modules that a
 * generated project is built from. Kept in sync with `validateChoices` in the
 * CLI: a preset is only useful if `create` can install it without error.
 */
export const presetSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  architecture: architectureEnum,
  backend: backendSchema,
  auth: authEnum,
  storage: storageSchema,
  modules: z.array(z.string()),
});
export type Preset = z.infer<typeof presetSchema>;

/**
 * `create`     — no file exists at the target yet.
 * `unchanged`  — the target is byte-identical to the template.
 * `modified`   — the user (or another module) already customised the target.
 */
export type FileStatus = "create" | "unchanged" | "modified";

export interface PlannedFile {
  source: string;
  target: string;
  content: string;
  status: FileStatus;
  checksum: string;
}

export interface InstallPlan {
  modules: RegistryModule[];
  /** Modules requested but skipped because config already records them. */
  alreadyInstalled: string[];
  files: PlannedFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  environmentVariables: string[];
  instructions: string[];
}

function directoryExists(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Locate the bundled registry.
 *
 * Resolution order:
 *   1. `OPENCRAFT_REGISTRY` — explicit override, used by tests and by the CLI
 *      when it has already located the repository root.
 *   2. Walking up from this module. This covers both the monorepo layout
 *      (`packages/registry/src`) and the published layout, where `registry/` is
 *      copied to the package root alongside `dist/`.
 *   3. `<cwd>/registry` — running from a checkout of the OpenCraft repo itself.
 *
 * Previously this only checked `../registry` relative to the compiled file,
 * which resolved to `dist/registry` and made `list`/`diff`/`info` fail.
 */
export function resolveRegistryRoot(): string {
  const override = process.env.OPENCRAFT_REGISTRY;
  if (override && directoryExists(path.join(override, "modules"))) return override;

  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(directory, "registry");
    if (directoryExists(path.join(candidate, "modules"))) return candidate;
    directory = path.dirname(directory);
  }

  const fromCwd = path.join(process.cwd(), "registry");
  if (directoryExists(path.join(fromCwd, "modules"))) return fromCwd;

  throw new Error(
    "Could not locate the OpenCraft registry. Set OPENCRAFT_REGISTRY to the directory containing `modules/`.",
  );
}

/** @deprecated Use {@link resolveRegistryRoot}. Kept for backwards compatibility. */
export const defaultRegistryRoot = (): string => resolveRegistryRoot();

export async function loadRegistry(
  root: string = resolveRegistryRoot(),
): Promise<Map<string, RegistryModule>> {
  const result = new Map<string, RegistryModule>();
  const modulesRoot = path.join(root, "modules");

  for (const name of await fs.readdir(modulesRoot)) {
    const directory = path.join(modulesRoot, name);
    if (!directoryExists(directory)) continue;

    const manifestPath = path.join(directory, "module.json");
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (error) {
      throw new Error(
        `Invalid module manifest at ${manifestPath}: ${error instanceof Error ? error.message : "unreadable"}`,
        { cause: error },
      );
    }

    const parsed = manifestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid module manifest at ${manifestPath}: ${z.prettifyError(parsed.error)}`,
      );
    }
    result.set(parsed.data.name, { manifest: parsed.data, directory });
  }

  return result;
}

/**
 * Load every preset bundled in `registry/presets/*.json`, sorted by name.
 * A broken preset fails loudly so CI can catch it before it reaches users.
 */
export async function loadPresets(root: string = resolveRegistryRoot()): Promise<Preset[]> {
  const presetsRoot = path.join(root, "presets");
  if (!directoryExists(presetsRoot)) return [];

  const presets: Preset[] = [];
  for (const name of await fs.readdir(presetsRoot)) {
    if (!name.endsWith(".json")) continue;

    const file = path.join(presetsRoot, name);
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      throw new Error(
        `Invalid preset at ${file}: ${error instanceof Error ? error.message : "unreadable"}`,
        { cause: error },
      );
    }

    const parsed = presetSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid preset at ${file}: ${z.prettifyError(parsed.error)}`);
    }
    presets.push(parsed.data);
  }

  return presets.sort((a, b) => a.name.localeCompare(b.name));
}

/** Load a single preset by name, or `undefined` when it does not exist. */
export async function loadPreset(
  name: string,
  root: string = resolveRegistryRoot(),
): Promise<Preset | undefined> {
  const presets = await loadPresets(root);
  return presets.find((preset) => preset.name === name);
}

/**
 * Depth-first topological sort. Dependencies are emitted before the modules
 * that require them, and revisiting a node that is still on the stack means a
 * cycle.
 */
export function resolveModules(
  names: string[],
  registry: Map<string, RegistryModule>,
): RegistryModule[] {
  const ordered: RegistryModule[] = [];
  const settled = new Set<string>();
  const onStack = new Set<string>();

  const visit = (name: string, trail: string[]): void => {
    if (settled.has(name)) return;
    if (onStack.has(name)) {
      throw new Error(`Circular module dependency detected: ${[...trail, name].join(" -> ")}`);
    }

    const item = registry.get(name);
    if (!item) throw new Error(`Unknown module: ${name}`);

    onStack.add(name);
    for (const dependency of item.manifest.dependencies) {
      visit(dependency, [...trail, name]);
    }
    onStack.delete(name);

    settled.add(name);
    ordered.push(item);
  };

  for (const name of names) visit(name, []);
  return ordered;
}

/**
 * Translate a configured import alias (`@/features`) into a repository-relative
 * directory (`src/features`), so the `aliases` block in opencraft.config.json
 * actually drives file placement instead of being decorative.
 */
function aliasToDirectory(alias: string): string {
  if (alias.startsWith("@/")) return path.posix.join("src", alias.slice(2));
  if (alias.startsWith("./")) return alias.slice(2);
  return alias;
}

/**
 * Where domain-specific code lives for a given architecture.
 *
 * Feature-based and hybrid projects have a `features/` root. Atomic projects do
 * not, so domain modules live under `lib/` instead. Templates reference
 * `{{dir.domain}}` / `{{import.domain}}` and stay portable across all three.
 */
function domainAlias(config: OpenCraftConfig): string {
  return config.architecture === "atomic" ? config.aliases.lib : config.aliases.features;
}

/**
 * Where reusable, domain-agnostic presentational components live.
 *
 * Atomic and hybrid projects have the atomic layers, so a composed component
 * belongs in `molecules`. Feature-based projects keep only `components/ui`, so
 * shared components sit directly under `components`.
 */
function sharedComponentsAlias(config: OpenCraftConfig): string {
  const base = config.aliases.components;
  return config.architecture === "feature" ? base : `${base}/molecules`;
}

export function replacePlaceholders(value: string, config: OpenCraftConfig): string {
  const { aliases } = config;
  const domain = domainAlias(config);
  const shared = sharedComponentsAlias(config);

  const replacements: Record<string, string> = {
    // Filesystem directories, used in manifest `target` paths.
    "{{aliases.components}}": aliasToDirectory(aliases.components),
    "{{aliases.features}}": aliasToDirectory(aliases.features),
    "{{aliases.infrastructure}}": aliasToDirectory(aliases.infrastructure),
    "{{aliases.lib}}": aliasToDirectory(aliases.lib),
    "{{dir.domain}}": aliasToDirectory(domain),
    "{{dir.sharedComponents}}": aliasToDirectory(shared),

    // Import specifiers, used inside template file contents.
    "{{import.components}}": aliases.components,
    "{{import.features}}": aliases.features,
    "{{import.infrastructure}}": aliases.infrastructure,
    "{{import.lib}}": aliases.lib,
    "{{import.domain}}": domain,
    "{{import.sharedComponents}}": shared,

    "{{backend}}": config.backend.provider,
    "{{storage}}": config.storage.provider,
    "{{architecture}}": config.architecture,
  };

  return Object.entries(replacements).reduce(
    (output, [token, replacement]) => output.replaceAll(token, replacement),
    value,
  );
}

function entryApplies(entry: FileEntry, config: OpenCraftConfig): boolean {
  const backendMatches =
    !entry.when?.backend || entry.when.backend.includes(config.backend.provider);
  const storageMatches =
    !entry.when?.storage || entry.when.storage.includes(config.storage.provider);
  return backendMatches && storageMatches;
}

export async function planInstall(
  root: string,
  names: string[],
  config: OpenCraftConfig,
  registry: Map<string, RegistryModule>,
): Promise<InstallPlan> {
  const resolved = resolveModules(names, registry);
  const alreadyInstalled = resolved
    .filter((item) => config.modules[item.manifest.name])
    .map((item) => item.manifest.name);
  const modules = resolved.filter((item) => !config.modules[item.manifest.name]);

  const files: PlannedFile[] = [];
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const environmentVariables = new Set<string>();
  const instructions: string[] = [];
  const claimedTargets = new Map<string, string>();

  for (const item of modules) {
    const { manifest } = item;

    if (!manifest.supportedArchitectures.includes(config.architecture)) {
      throw new Error(
        `Module '${manifest.name}' does not support the '${config.architecture}' architecture (supported: ${manifest.supportedArchitectures.join(", ")}).`,
      );
    }
    if (
      manifest.supportedBackends &&
      !manifest.supportedBackends.includes(config.backend.provider)
    ) {
      throw new Error(
        `Module '${manifest.name}' requires one of these backends: ${manifest.supportedBackends.join(", ")} (current: ${config.backend.provider}).`,
      );
    }

    Object.assign(dependencies, manifest.npmDependencies);
    Object.assign(devDependencies, manifest.npmDevDependencies);
    for (const variable of manifest.environmentVariables) environmentVariables.add(variable.name);
    for (const instruction of manifest.instructions) {
      instructions.push(`[${manifest.name}] ${instruction}`);
    }

    const entries = (manifest.files[config.architecture] ?? []).filter((entry) =>
      entryApplies(entry, config),
    );

    for (const entry of entries) {
      const source = path.join(item.directory, entry.source);
      const target = path.join(root, replacePlaceholders(entry.target, config));

      const owner = claimedTargets.get(target);
      if (owner && owner !== manifest.name) {
        throw new Error(
          `Modules '${owner}' and '${manifest.name}' both write to ${path.relative(root, target)}. Resolve the conflict in the registry before installing.`,
        );
      }
      claimedTargets.set(target, manifest.name);

      // Placeholders are substituted in file contents as well as target paths,
      // so a template can import from the architecture's domain root without
      // shipping one copy per architecture. This is the only transform applied
      // to template bodies — no AST rewriting.
      const content = replacePlaceholders(await fs.readFile(source, "utf8"), config);
      const existing = (await pathExists(target)) ? await fs.readFile(target, "utf8") : null;
      const status: FileStatus =
        existing === null ? "create" : existing === content ? "unchanged" : "modified";

      files.push({ source, target, content, status, checksum: checksum(content) });
    }
  }

  return {
    modules,
    alreadyInstalled,
    files,
    dependencies,
    devDependencies,
    environmentVariables: [...environmentVariables],
    instructions,
  };
}

export async function applyFiles(plan: InstallPlan, overwrite = false): Promise<void> {
  for (const file of plan.files) {
    if (file.status === "modified" && !overwrite) {
      throw new Error(`Refusing to overwrite modified file: ${file.target}`);
    }
    if (file.status === "unchanged") continue;

    await fs.mkdir(path.dirname(file.target), { recursive: true });
    await fs.writeFile(file.target, file.content);
  }
}

/**
 * Append missing keys to `.env.example`. Never writes values — only names — so
 * the file stays safe to commit.
 */
export async function updateEnvExample(root: string, names: string[]): Promise<void> {
  if (!names.length) return;

  const target = path.join(root, ".env.example");
  const current = (await pathExists(target)) ? await fs.readFile(target, "utf8") : "";
  const known = new Set(
    current
      .split(/\r?\n/)
      .map((line) => line.split("=")[0]?.trim())
      .filter((key): key is string => Boolean(key)),
  );

  const additions = names.filter((name) => !known.has(name)).map((name) => `${name}=`);
  if (!additions.length) return;

  const prefix = current ? `${current.trimEnd()}\n` : "";
  await fs.writeFile(target, `${prefix}${additions.join("\n")}\n`);
}

export function filesForArchitecture(
  manifest: ModuleManifest,
  architecture: Architecture,
): FileEntry[] {
  return manifest.files[architecture] ?? [];
}
