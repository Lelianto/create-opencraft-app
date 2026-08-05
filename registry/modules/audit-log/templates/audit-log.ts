import "server-only";

/**
 * Structured audit logging with secret redaction.
 *
 * ## Scope, stated honestly
 *
 * This writes to stdout as JSON. That is genuinely useful — hosting platforms
 * collect stdout, and structured lines are queryable — but stdout is **not** an
 * audit trail for compliance purposes: it is not tamper-evident, and retention is
 * whatever your platform happens to keep.
 *
 * If you need audit logging for SOC 2, HIPAA, or similar, implement `persist()`
 * below against an append-only store and make the table insert-only (no UPDATE or
 * DELETE grants, even for the application role).
 */

/**
 * Keys whose values are replaced before logging.
 *
 * Stored lower-cased because lookups are lower-cased. This previously mixed
 * camelCase entries (`apiKey`, `accessToken`) with a `toLowerCase()` lookup, so
 * those keys never matched and their values were logged in the clear.
 */
const sensitiveKeys = new Set([
  "password",
  "passwd",
  "pass",
  "token",
  "secret",
  "apikey",
  "api_key",
  "privatekey",
  "private_key",
  "authorization",
  "auth",
  "cookie",
  "session",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "clientsecret",
  "client_secret",
  "creditcard",
  "card_number",
  "ssn",
]);

/** Also catch compound names like `stripeApiKey` or `user_password_hash`. */
const sensitivePattern = /(password|secret|token|apikey|api_key|private_key|credential)/i;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
  return (
    sensitiveKeys.has(normalized) ||
    sensitiveKeys.has(normalized.replace(/_/g, "")) ||
    sensitivePattern.test(key)
  );
}

const MAX_DEPTH = 4;
const MAX_ARRAY = 50;
const MAX_STRING = 2_000;

function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[depth-limited]";

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > MAX_STRING ? `[truncated ${value.length} chars]` : value;
  }
  if (typeof value !== "object") return value;

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  if (Array.isArray(value)) {
    const head = value.slice(0, MAX_ARRAY).map((entry) => redact(entry, depth + 1));
    return value.length > MAX_ARRAY ? [...head, `[+${value.length - MAX_ARRAY} more]`] : head;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? "[redacted]" : redact(entry, depth + 1),
    ]),
  );
}

export interface AuditEntry {
  /** Machine-readable action, e.g. "product.delete". */
  action: string;
  /** Authenticated actor, or null for anonymous/system actions. */
  actorId: string | null;
  /** Target identifier, e.g. "product:abc123". */
  resource?: string;
  outcome?: "success" | "failure";
  metadata?: Record<string, unknown>;
}

/**
 * Replace this with a durable, append-only write.
 *
 * Keep it non-throwing: an audit sink being down must not take a request with it.
 */
async function persist(record: Record<string, unknown>): Promise<void> {
  // Structured single line so log processors can parse it.
  console.info(JSON.stringify({ type: "audit", ...record }));
  await Promise.resolve();
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const record = {
    time: new Date().toISOString(),
    action: entry.action.slice(0, 120),
    actorId: entry.actorId,
    outcome: entry.outcome ?? "success",
    ...(entry.resource ? { resource: entry.resource.slice(0, 500) } : {}),
    ...(entry.metadata ? { metadata: redact(entry.metadata) } : {}),
  };

  try {
    await persist(record);
  } catch {
    // Never let auditing break the request it is describing.
  }
}

/** Exported for unit tests, so the redaction rules can be asserted directly. */
export const __testing = { redact, isSensitiveKey };
