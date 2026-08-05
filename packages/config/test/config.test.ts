import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { configSchema, createDefaultConfig, readConfig, writeConfigAtomic } from "../src/index.js";

describe("config", () => {
  it("uses hybrid defaults", () => {
    const config = createDefaultConfig();
    expect(config.architecture).toBe("hybrid");
    expect(config.backend.provider).toBe("none");
    expect(config.authentication.methods).toEqual([]);
  });

  it("rejects unknown providers", () => {
    expect(() =>
      configSchema.parse({ ...createDefaultConfig(), backend: { provider: "mysql" } }),
    ).toThrow();
  });

  it("rejects invalid architecture", () => {
    expect(() => createDefaultConfig({ architecture: "bogus" as never })).toThrow();
  });

  it("merges partial input with defaults", () => {
    const config = createDefaultConfig({
      backend: { provider: "firebase" },
      architecture: "feature",
    });
    expect(config.backend.provider).toBe("firebase");
    expect(config.architecture).toBe("feature");
    expect(config.aliases.features).toBe("@/features");
  });

  it("writes and reads atomically", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "config-rw-"));
    try {
      const config = createDefaultConfig({
        packageManager: "bun",
        storage: { provider: "supabase" },
      });
      await writeConfigAtomic(dir, config);
      const roundTrip = await readConfig(dir);
      expect(roundTrip).toEqual(config);
      const leftovers = (await fs.readdir(dir)).filter((name) => name.endsWith(".tmp"));
      expect(leftovers).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
