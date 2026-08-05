import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const architectureSchema = z.enum(["feature", "atomic", "hybrid"]);
export const packageManagerSchema = z.enum(["npm", "pnpm", "yarn", "bun"]);
export const backendSchema = z.enum(["none", "supabase", "firebase"]);
export const storageSchema = z.enum(["none", "vercel-blob", "supabase", "firebase"]);
export const moduleStateSchema = z.object({
  version: z.string().min(1),
  files: z.record(z.string(), z.string()).default({}),
});
export const configSchema = z.object({
  $schema: z.string().url().default("https://opencraft.dev/schema.json"),
  version: z.literal(1),
  framework: z.literal("nextjs"),
  architecture: architectureSchema,
  packageManager: packageManagerSchema,
  aliases: z.object({
    components: z.string(),
    features: z.string(),
    infrastructure: z.string(),
    lib: z.string(),
  }),
  backend: z.object({ provider: backendSchema }),
  authentication: z.object({ provider: backendSchema, methods: z.array(z.enum(["google"])) }),
  storage: z.object({ provider: storageSchema }),
  modules: z.record(z.string(), moduleStateSchema),
});
export type OpenCraftConfig = z.infer<typeof configSchema>;
export type Architecture = z.infer<typeof architectureSchema>;
export type PackageManager = z.infer<typeof packageManagerSchema>;
export type Backend = z.infer<typeof backendSchema>;
export type Storage = z.infer<typeof storageSchema>;

export function createDefaultConfig(input: Partial<OpenCraftConfig> = {}): OpenCraftConfig {
  return configSchema.parse({
    $schema: "https://opencraft.dev/schema.json",
    version: 1,
    framework: "nextjs",
    architecture: "hybrid",
    packageManager: "pnpm",
    aliases: {
      components: "@/components",
      features: "@/features",
      infrastructure: "@/infrastructure",
      lib: "@/lib",
    },
    backend: { provider: "none" },
    authentication: { provider: "none", methods: [] },
    storage: { provider: "none" },
    modules: {},
    ...input,
  });
}
export async function readConfig(root: string): Promise<OpenCraftConfig> {
  const raw: unknown = JSON.parse(
    await fs.readFile(path.join(root, "opencraft.config.json"), "utf8"),
  );
  return configSchema.parse(raw);
}
export async function writeConfigAtomic(root: string, value: OpenCraftConfig): Promise<void> {
  const checked = configSchema.parse(value);
  const target = path.join(root, "opencraft.config.json");
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(checked, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, target);
}
