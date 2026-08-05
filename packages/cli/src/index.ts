import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  createDefaultConfig,
  readConfig,
  writeConfigAtomic,
  type Architecture,
  type Backend,
  type OpenCraftConfig,
  type PackageManager,
  type Storage,
} from "@antihero/config";
import {
  applyFiles,
  loadRegistry,
  planInstall,
  resolveRegistryRoot,
  updateEnvExample,
  type InstallPlan,
} from "@antihero/registry";
import { detectPackageManager, packageCommand, pathExists } from "@antihero/shared";

export interface CreateOptions {
  projectName: string;
  directory: string;
  architecture: Architecture;
  backend: Backend;
  auth: "none" | "google";
  storage: Storage;
  modules: string[];
  packageManager: PackageManager;
  install: boolean;
  git: boolean;
  dryRun: boolean;
  yes: boolean;
}

export interface AddOptions {
  dryRun?: boolean;
  yes?: boolean;
  overwrite?: boolean;
  install?: boolean;
}

function directoryExists(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Locate the directory holding `templates/` and `registry/`. In the published
 * package both are copied next to `dist/`; in the monorepo they live at the
 * repository root.
 */
function findAssetRoot(): string {
  let current = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    if (
      directoryExists(path.join(current, "templates/nextjs-base")) &&
      directoryExists(path.join(current, "registry/modules"))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error("OpenCraft templates are missing from this installation.");
}

/** Expand user selections into the concrete module list they imply. */
function moduleNames(
  options: Pick<CreateOptions, "backend" | "auth" | "storage" | "modules">,
): string[] {
  const names = [...options.modules];
  if (options.backend !== "none") names.push(`auth-${options.backend}`);
  if (options.auth === "google") names.push("google-auth");
  if (options.storage !== "none") names.push(`storage-${options.storage}`);
  return [...new Set(names)];
}

export function validateChoices(
  options: Pick<CreateOptions, "backend" | "auth" | "storage" | "modules">,
): void {
  if (options.storage === "supabase" && options.backend !== "supabase") {
    throw new Error("Supabase Storage requires the Supabase backend.");
  }
  if (options.storage === "firebase" && options.backend !== "firebase") {
    throw new Error("Firebase Storage requires the Firebase backend.");
  }
  if (options.auth === "google" && options.backend === "none") {
    throw new Error("Google authentication requires Supabase or Firebase as the backend.");
  }
  const needsStorage = options.modules.some(
    (name) => name === "image-upload" || name === "file-upload",
  );
  if (needsStorage && options.storage === "none") {
    throw new Error(
      "Uploading requires a storage provider. Choose vercel-blob, supabase, or firebase.",
    );
  }
  if (needsStorage && options.backend === "none") {
    // Uploads are authenticated and namespaced per user, so they need an identity
    // provider. Allowing anonymous uploads by default would be a security hole.
    throw new Error(
      "Uploading requires an authentication backend so uploads can be attributed and authorised. Choose supabase or firebase.",
    );
  }
}

async function copyTemplate(
  source: string,
  target: string,
  replacements: Record<string, string>,
): Promise<string[]> {
  const created: string[] = [];

  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    // `.gitignore` cannot ship inside an npm package, so it is stored as
    // `gitignore` and renamed on the way out.
    const name = entry.name === "gitignore" ? ".gitignore" : entry.name;
    const to = path.join(target, name);

    if (entry.isDirectory()) {
      created.push(...(await copyTemplate(from, to, replacements)));
      continue;
    }

    await fs.mkdir(path.dirname(to), { recursive: true });
    let content = await fs.readFile(from, "utf8");
    for (const [token, value] of Object.entries(replacements)) {
      content = content.replaceAll(`{{${token}}}`, value);
    }
    await fs.writeFile(to, content);
    created.push(to);
  }

  return created;
}

async function createArchitecture(
  root: string,
  architecture: Architecture,
  assetRoot: string,
): Promise<void> {
  const definitionPath = path.join(assetRoot, "registry/architectures", `${architecture}.json`);
  const definition = JSON.parse(await fs.readFile(definitionPath, "utf8")) as {
    directories: string[];
  };

  await Promise.all(
    definition.directories.map((directory) =>
      fs.mkdir(path.join(root, directory), { recursive: true }),
    ),
  );
}

function architectureGuidance(architecture: Architecture): string[] {
  if (architecture === "atomic") {
    return [
      "- Keep shadcn primitives in `src/components/ui`. Never move them into `atoms/`.",
      "- `atoms` are the smallest app-specific components; `molecules` compose atoms; `organisms` compose molecules into complete sections; `templates` define page structure without binding to specific data.",
      "- Do not force a domain-specific component into an atomic layer. If it understands business rules, keep it beside the route that owns it.",
    ];
  }
  if (architecture === "feature") {
    return [
      "- Keep shadcn primitives in `src/components/ui`.",
      "- All business code lives under `src/features/<feature>/`.",
      "- Never import another feature's internal files. Cross-feature access goes through that feature's `index.ts` public export.",
    ];
  }
  return [
    "- Keep shadcn primitives in `src/components/ui`.",
    "- Reusable presentational components follow the atomic layers in `src/components`.",
    "- Any component, schema, service, hook, or type that understands the business domain belongs in `src/features/<feature>/`.",
    "- Cross-feature access goes through that feature's `index.ts` public export.",
  ];
}

function backendGuidance(config: OpenCraftConfig): string[] {
  if (config.backend.provider === "supabase") {
    return [
      "- Database access goes through the Supabase client in `src/infrastructure`. Never build SQL by string concatenation; use the query builder or parameterised RPC.",
      "- Row Level Security is the last line of defence, not the only one. Still check ownership in the Route Handler.",
      "- On the server use `supabase.auth.getUser()`; it revalidates the token. Never trust `getSession()` for authorization decisions.",
    ];
  }
  if (config.backend.provider === "firebase") {
    return [
      "- Firestore access goes through `firebase-admin` in `src/infrastructure`. Never accept a raw collection name, field path, operator, or order field from the client — map user input through an allowlist.",
      "- Security Rules are the last line of defence, not the only one. Still check ownership in the Route Handler.",
      "- Verify the session cookie with `verifySessionCookie(cookie, true)` so revoked sessions are rejected.",
    ];
  }
  return [
    "- This project has no backend provider configured. Add one with `opencraft add auth-supabase` or `opencraft add auth-firebase` before persisting user data.",
  ];
}

function storageGuidance(config: OpenCraftConfig): string[] {
  if (config.storage.provider === "none") {
    return ["- No storage provider is configured. Do not call a storage SDK directly."];
  }
  return [
    `- Uploads go through the \`${config.storage.provider}\` adapter in \`src/infrastructure/storage.ts\`. Do not call the provider SDK directly from a route or component.`,
    "- Always re-validate uploads on the server: magic bytes, MIME allowlist, size, dimensions, and a randomly generated storage key. Reject SVG for image uploads.",
  ];
}

export function renderAgents(config: OpenCraftConfig): string {
  const modules = Object.keys(config.modules).sort();
  const pm = config.packageManager;
  const authMethods = config.authentication.methods.join(", ") || "none";

  const lines = [
    "# AGENTS.md",
    "",
    "Machine-readable contract for AI coding agents working in this repository.",
    "Follow it exactly; it exists so you do not have to rediscover the architecture.",
    "",
    "## Stack",
    "",
    "- Next.js App Router (no Pages Router), TypeScript strict mode",
    "- Tailwind CSS v4 and shadcn/ui",
    `- Component architecture: **${config.architecture}**`,
    `- Backend provider: **${config.backend.provider}**`,
    `- Authentication: **${config.authentication.provider}** (methods: ${authMethods})`,
    `- Storage provider: **${config.storage.provider}**`,
    `- Package manager: **${pm}**`,
    "",
    "## Where code goes",
    "",
    ...architectureGuidance(config.architecture),
    "- Provider SDK setup belongs in `src/infrastructure`.",
    "- Shared, domain-agnostic helpers belong in `src/lib`.",
    "- HTTP endpoints are Next.js Route Handlers at `src/app/api/**/route.ts`.",
    "",
    "## Route Handler rules",
    "",
    "Every handler that touches user data must, in this order:",
    "",
    "1. Verify the session **server-side** (`requireUser()` from the auth module).",
    "2. Check authorization and record ownership for the specific resource.",
    "3. Validate all input with Zod (body, query, and route params).",
    "4. Perform the operation through the installed adapter.",
    "5. Return a typed `ApiResponse<T>` via the `src/lib/api-response.ts` helpers.",
    "",
    "Never read identity from a request header or any other client-controlled value.",
    "Never return a stack trace or provider error text to the client.",
    "",
    "## Security rules",
    "",
    ...backendGuidance(config),
    ...storageGuidance(config),
    "- Validate every external input on the server with Zod. Client validation is UX only.",
    "- Never trust client-side authorization. A confirmation dialog is not a security control.",
    "- Validate redirect targets against a same-origin allowlist to prevent open redirects.",
    "- Use the SSRF-safe fetch helper for any outbound request whose URL is influenced by user input.",
    "- Never log secrets, tokens, cookies, or raw request bodies.",
    "- Keep secrets in `.env.local`. `.env.example` holds names only, never values.",
    "",
    "## Conventions",
    "",
    "- Reuse an installed module before inventing a new abstraction.",
    "- Do not change the selected architecture without explicit approval.",
    "- Do not add a dependency that duplicates one already installed.",
    `- Installed OpenCraft modules: ${modules.join(", ") || "none"}`,
    "",
    "## Verify before finishing",
    "",
    "```bash",
    `${pm} run lint`,
    `${pm} run type-check`,
    `${pm} run test`,
    `${pm} run build`,
    "```",
    "",
  ];

  return lines.join("\n");
}

async function mergeDependencies(root: string, plan: InstallPlan): Promise<void> {
  const target = path.join(root, "package.json");
  const pkg = JSON.parse(await fs.readFile(target, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const sortRecord = (value: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));

  if (Object.keys(plan.dependencies).length) {
    pkg.dependencies = sortRecord({ ...pkg.dependencies, ...plan.dependencies });
  }
  if (Object.keys(plan.devDependencies).length) {
    pkg.devDependencies = sortRecord({ ...pkg.devDependencies, ...plan.devDependencies });
  }

  await fs.writeFile(target, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function run(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with code ${code ?? "unknown"}`)),
    );
  });
}

export function printPlan(plan: InstallPlan): string {
  const sections = [
    `Modules:          ${plan.modules.map((item) => item.manifest.name).join(", ") || "none"}`,
  ];

  if (plan.alreadyInstalled.length) {
    sections.push(`Already installed: ${plan.alreadyInstalled.join(", ")}`);
  }

  sections.push(
    `Files:\n${plan.files.map((file) => `  ${file.status.padEnd(9)} ${file.target}`).join("\n") || "  none"}`,
    `Dependencies:     ${Object.keys(plan.dependencies).join(", ") || "none"}`,
    `Dev dependencies: ${Object.keys(plan.devDependencies).join(", ") || "none"}`,
    `Environment:      ${plan.environmentVariables.join(", ") || "none"}`,
  );

  if (plan.instructions.length) {
    sections.push(`Manual steps:\n${plan.instructions.map((line) => `  - ${line}`).join("\n")}`);
  }

  return sections.join("\n");
}

/**
 * Install modules into an existing project.
 *
 * Ordering matters: files are written first, then package.json, then
 * `.env.example`, and only then is the config updated. If any step throws, the
 * config still reports the module as absent rather than falsely claiming a
 * successful install.
 */
export async function addModules(
  root: string,
  names: string[],
  options: AddOptions = {},
): Promise<InstallPlan> {
  let config = await readConfig(root);
  process.env.OPENCRAFT_REGISTRY = path.join(findAssetRoot(), "registry");
  const registry = await loadRegistry(resolveRegistryRoot());

  // Uploads need whichever storage adapter the project already selected.
  const expanded = [...names];
  const wantsUpload = names.includes("image-upload") || names.includes("file-upload");
  if (wantsUpload && config.storage.provider !== "none") {
    expanded.push(`storage-${config.storage.provider}`);
  }

  const plan = await planInstall(root, expanded, config, registry);
  if (options.dryRun) return plan;
  if (!plan.modules.length) return plan;

  if (plan.files.some((file) => file.status === "modified") && !options.overwrite) {
    throw new Error(
      "Refusing to overwrite files you have customised. Review them with `opencraft diff <module>`, then re-run with --overwrite.",
    );
  }

  await applyFiles(plan, options.overwrite);
  await mergeDependencies(root, plan);
  await updateEnvExample(root, plan.environmentVariables);

  for (const item of plan.modules) {
    const files = plan.files
      .filter((file) => file.source.startsWith(item.directory))
      .map((file) => [path.relative(root, file.target), file.checksum] as const);

    config = {
      ...config,
      modules: {
        ...config.modules,
        [item.manifest.name]: {
          version: item.manifest.version,
          files: Object.fromEntries(files),
        },
      },
    };
  }

  await writeConfigAtomic(root, config);
  await fs.writeFile(path.join(root, "AGENTS.md"), renderAgents(config));

  if (options.install) {
    const command = packageCommand(config.packageManager, "install");
    await run(command[0]!, command.slice(1), root);
  }

  return plan;
}

export async function createProject(
  options: CreateOptions,
): Promise<{ files: string[]; plan: InstallPlan }> {
  validateChoices(options);

  const assetRoot = findAssetRoot();
  const target = path.resolve(options.directory);
  if ((await pathExists(target)) && (await fs.readdir(target)).length) {
    throw new Error(`Target directory is not empty: ${target}`);
  }

  const config = createDefaultConfig({
    architecture: options.architecture,
    packageManager: options.packageManager,
    backend: { provider: options.backend },
    authentication: {
      provider: options.auth === "google" ? options.backend : "none",
      methods: options.auth === "google" ? ["google"] : [],
    },
    storage: { provider: options.storage },
  });

  const registry = await loadRegistry(path.join(assetRoot, "registry"));
  const names = moduleNames(options);

  const plan = await planInstall(target, names, config, registry);
  if (options.dryRun) return { files: [], plan };

  await fs.mkdir(target, { recursive: true });
  const files = await copyTemplate(path.join(assetRoot, "templates/nextjs-base"), target, {
    projectName: options.projectName,
    runCommand: options.packageManager,
  });

  await createArchitecture(target, options.architecture, assetRoot);
  await writeConfigAtomic(target, config);
  await addModules(target, names, { yes: true, install: false });

  // `addModules` regenerates AGENTS.md, but it returns early when there is
  // nothing to install — so write it here to cover the zero-module case.
  await fs.writeFile(path.join(target, "AGENTS.md"), renderAgents(await readConfig(target)));

  if (options.install) {
    const command = packageCommand(options.packageManager, "install");
    await run(command[0]!, command.slice(1), target);
  }
  if (options.git) {
    await run("git", ["init"], target);
  }

  return { files, plan };
}

export async function initProject(
  root: string,
  architecture: Architecture,
): Promise<OpenCraftConfig> {
  const hasSrcApp = await pathExists(path.join(root, "src/app"));
  const hasRootApp = await pathExists(path.join(root, "app"));
  if (!hasSrcApp && !hasRootApp) {
    throw new Error(
      "Next.js App Router was not detected. OpenCraft expects an `app/` or `src/app/` directory and does not support the Pages Router.",
    );
  }
  if (await pathExists(path.join(root, "pages"))) {
    throw new Error(
      "A `pages/` directory was found. Migrate to the App Router before running `opencraft init`.",
    );
  }
  if (!(await pathExists(path.join(root, "tsconfig.json")))) {
    throw new Error("TypeScript was not detected: tsconfig.json is missing.");
  }
  if (await pathExists(path.join(root, "opencraft.config.json"))) {
    throw new Error(
      "This project already has opencraft.config.json. Use `opencraft add <module>` instead.",
    );
  }

  const config = createDefaultConfig({
    architecture,
    packageManager: await detectPackageManager(root),
  });

  await writeConfigAtomic(root, config);
  await fs.writeFile(path.join(root, "AGENTS.md"), renderAgents(config));
  return config;
}

/**
 * Parse `.env`-style files for variable *names* only. Values are never read
 * into memory beyond the split, and never logged.
 */
async function definedEnvNames(root: string): Promise<Set<string>> {
  const names = new Set<string>();

  for (const file of [".env.local", ".env", ".env.development.local", ".env.production.local"]) {
    const target = path.join(root, file);
    if (!(await pathExists(target))) continue;

    const content = await fs.readFile(target, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const key = trimmed
        .replace(/^export\s+/, "")
        .split("=")[0]
        ?.trim();
      const hasValue = trimmed.includes("=") && trimmed.split("=").slice(1).join("=").trim() !== "";
      if (key && hasValue) names.add(key);
    }
  }

  for (const key of Object.keys(process.env)) {
    if (process.env[key]) names.add(key);
  }

  return names;
}

export async function doctor(root: string): Promise<string[]> {
  const issues: string[] = [];

  let config: OpenCraftConfig;
  try {
    config = await readConfig(root);
  } catch (error) {
    return [
      `Invalid or missing opencraft.config.json: ${error instanceof Error ? error.message : "unknown error"}`,
    ];
  }

  const hasSrcApp = await pathExists(path.join(root, "src/app"));
  const hasRootApp = await pathExists(path.join(root, "app"));
  if (!hasSrcApp && !hasRootApp) issues.push("Next.js App Router directory is missing.");
  if (await pathExists(path.join(root, "pages"))) {
    issues.push("A `pages/` directory exists. OpenCraft targets the App Router only.");
  }

  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const installedDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  process.env.OPENCRAFT_REGISTRY = path.join(findAssetRoot(), "registry");
  const registry = await loadRegistry(resolveRegistryRoot());
  const available = await definedEnvNames(root);

  // Provider consistency.
  if (
    config.authentication.provider !== "none" &&
    config.authentication.provider !== config.backend.provider
  ) {
    issues.push(
      `Authentication provider '${config.authentication.provider}' does not match backend '${config.backend.provider}'.`,
    );
  }
  if (config.storage.provider === "supabase" && config.backend.provider !== "supabase") {
    issues.push("Storage is set to 'supabase' but the backend provider is not Supabase.");
  }
  if (config.storage.provider === "firebase" && config.backend.provider !== "firebase") {
    issues.push("Storage is set to 'firebase' but the backend provider is not Firebase.");
  }

  for (const [name, state] of Object.entries(config.modules)) {
    const item = registry.get(name);
    if (!item) {
      issues.push(`Installed module is absent from the registry: ${name}`);
      continue;
    }

    if (item.manifest.version !== state.version) {
      issues.push(
        `Module '${name}' is at ${state.version} but the registry ships ${item.manifest.version}. Run \`opencraft update ${name}\`.`,
      );
    }

    for (const [file, expected] of Object.entries(state.files)) {
      if (!(await pathExists(path.join(root, file)))) {
        issues.push(`Missing module file: ${file}`);
        continue;
      }
      if (!expected) issues.push(`Missing recorded checksum for: ${file}`);
    }

    for (const dependency of Object.keys(item.manifest.npmDependencies)) {
      if (!installedDeps[dependency]) issues.push(`Missing dependency: ${dependency}`);
    }

    // Report names and availability only — never values.
    for (const variable of item.manifest.environmentVariables) {
      if (variable.required && !available.has(variable.name)) {
        issues.push(`Environment variable not set: ${variable.name} (${variable.description})`);
      }
    }
  }

  return issues;
}
