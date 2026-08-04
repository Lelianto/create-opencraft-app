import { promises as fs, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Architecture, OpenCraftConfig } from "@antihero/config";
import { checksum, pathExists } from "@antihero/shared";

const fileEntrySchema = z.object({ source: z.string(), target: z.string(), when: z.object({ backend: z.array(z.string()).optional(), storage: z.array(z.string()).optional() }).optional() });
export const manifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/), version: z.string(), description: z.string(), supportedArchitectures: z.array(z.enum(["atomic","feature","hybrid"])),
  supportedBackends: z.array(z.enum(["none","supabase","firebase"])).optional(), dependencies: z.array(z.string()).default([]),
  npmDependencies: z.record(z.string(), z.string()).default({}), npmDevDependencies: z.record(z.string(), z.string()).default({}), environmentVariables: z.array(z.object({ name: z.string(), description: z.string(), required: z.boolean().default(true) })).default([]),
  files: z.record(z.enum(["atomic","feature","hybrid"]), z.array(fileEntrySchema)), instructions: z.array(z.string()).default([]),
});
export type ModuleManifest = z.infer<typeof manifestSchema>;
export interface RegistryModule { manifest: ModuleManifest; directory: string }
export type FileStatus = "create" | "unchanged" | "modified";
export interface PlannedFile { source: string; target: string; content: string; status: FileStatus; checksum: string }
export interface InstallPlan { modules: RegistryModule[]; files: PlannedFile[]; dependencies: Record<string,string>; devDependencies: Record<string,string>; environmentVariables: string[] }

export const defaultRegistryRoot = (): string => process.env.OPENCRAFT_REGISTRY ?? (requireExists(path.join(process.cwd(),"registry/modules"))?path.join(process.cwd(),"registry"):path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../registry"));
function requireExists(target:string):boolean{try{return Boolean(statSync(target))}catch{return false}}
export async function loadRegistry(root = defaultRegistryRoot()): Promise<Map<string, RegistryModule>> {
  const result = new Map<string, RegistryModule>(); const modulesRoot = path.join(root, "modules");
  for (const name of await fs.readdir(modulesRoot)) { const directory = path.join(modulesRoot, name); const raw: unknown = JSON.parse(await fs.readFile(path.join(directory, "module.json"), "utf8")); const manifest = manifestSchema.parse(raw); result.set(manifest.name, { manifest, directory }); }
  return result;
}
export function resolveModules(names: string[], registry: Map<string, RegistryModule>): RegistryModule[] {
  const ordered: RegistryModule[] = []; const done = new Set<string>(); const visiting = new Set<string>();
  const visit = (name: string): void => { if (done.has(name)) return; if (visiting.has(name)) throw new Error(`Circular module dependency detected at ${name}`); const item = registry.get(name); if (!item) throw new Error(`Unknown module: ${name}`); visiting.add(name); item.manifest.dependencies.forEach(visit); visiting.delete(name); done.add(name); ordered.push(item); };
  names.forEach(visit); return ordered;
}
export function replacePlaceholders(value: string, config: OpenCraftConfig): string {
  const replacements: Record<string,string> = { "{{aliases.components}}": "src/components", "{{aliases.features}}": "src/features", "{{aliases.infrastructure}}": "src/infrastructure", "{{aliases.lib}}": "src/lib" };
  return Object.entries(replacements).reduce((output,[token,replacement]) => output.replaceAll(token,replacement), value).replaceAll("{{backend}}", config.backend.provider).replaceAll("{{storage}}", config.storage.provider);
}
function selected(entry: z.infer<typeof fileEntrySchema>, config: OpenCraftConfig): boolean { return (!entry.when?.backend || entry.when.backend.includes(config.backend.provider)) && (!entry.when?.storage || entry.when.storage.includes(config.storage.provider)); }
export async function planInstall(root: string, names: string[], config: OpenCraftConfig, registry: Map<string,RegistryModule>): Promise<InstallPlan> {
  const modules = resolveModules(names, registry).filter((item) => !config.modules[item.manifest.name]); const files: PlannedFile[] = []; const dependencies: Record<string,string> = {}; const devDependencies: Record<string,string> = {}; const environmentVariables = new Set<string>();
  for (const item of modules) {
    if (!item.manifest.supportedArchitectures.includes(config.architecture)) throw new Error(`${item.manifest.name} does not support ${config.architecture}`);
    if (item.manifest.supportedBackends && !item.manifest.supportedBackends.includes(config.backend.provider)) throw new Error(`${item.manifest.name} requires one of: ${item.manifest.supportedBackends.join(", ")}`);
    Object.assign(dependencies, item.manifest.npmDependencies); Object.assign(devDependencies, item.manifest.npmDevDependencies); item.manifest.environmentVariables.forEach((item) => environmentVariables.add(item.name));
    for (const entry of item.manifest.files[config.architecture].filter((file) => selected(file, config))) { const source = path.join(item.directory, entry.source); const target = path.join(root, replacePlaceholders(entry.target, config)); const content = await fs.readFile(source, "utf8"); const existing = await pathExists(target) ? await fs.readFile(target, "utf8") : null; files.push({ source, target, content, status: existing === null ? "create" : existing === content ? "unchanged" : "modified", checksum: checksum(content) }); }
  }
  return { modules, files, dependencies, devDependencies, environmentVariables: [...environmentVariables] };
}
export async function applyFiles(plan: InstallPlan, overwrite = false): Promise<void> { for (const file of plan.files) { if (file.status === "modified" && !overwrite) throw new Error(`Refusing to overwrite modified file: ${file.target}`); if (file.status === "unchanged") continue; await fs.mkdir(path.dirname(file.target), { recursive: true }); await fs.writeFile(file.target, file.content); } }
export async function updateEnvExample(root: string, names: string[]): Promise<void> { const target = path.join(root, ".env.example"); const current = await pathExists(target) ? await fs.readFile(target,"utf8") : ""; const known = new Set(current.split(/\r?\n/).map((line) => line.split("=")[0])); const additions = names.filter((name) => !known.has(name)).map((name) => `${name}=`); if (additions.length) await fs.writeFile(target, `${current.trimEnd()}${current ? "\n" : ""}${additions.join("\n")}\n`); }
export function filesForArchitecture(manifest: ModuleManifest, architecture: Architecture) { return manifest.files[architecture]; }
