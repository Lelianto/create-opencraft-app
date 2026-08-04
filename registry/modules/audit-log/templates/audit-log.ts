import "server-only";

const sensitiveKeys = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "privateKey",
  "authorization",
  "cookie",
  "accessToken",
  "refreshToken",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[depth-limited]";
  if (value === null || typeof value !== "object") return typeof value === "string" && value.length > 2_000 ? "[truncated]" : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => redact(entry, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? "[redacted]" : redact(entry, depth + 1),
    ]),
  );
}

export interface AuditEntry {
  action: string;
  actorId: string | null;
  resource?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry, error?: unknown): Promise<void> {
  const safe = {
    time: new Date().toISOString(),
    action: entry.action.slice(0, 120),
    actorId: entry.actorId,
    resource: entry.resource ? entry.resource.slice(0, 500) : undefined,
    metadata: entry.metadata ? redact(entry.metadata) : undefined,
  };
  console.info("audit", JSON.stringify(safe));
  // TODO: persist to a durable store (database table or log sink). Never store secrets.
  void error;
}