import { fileTypeFromBuffer } from "file-type";
import { requireUser } from "@/infrastructure/auth";
import { storage } from "@/infrastructure/storage";
import { checkRateLimit } from "@/infrastructure/rate-limit";
import { ok, fail } from "@/lib/api-response";
import { AppError, logError, toAppError } from "@/lib/errors";

const maxBytes = 10_000_000;

/**
 * Binary formats whose identity can be proven from their magic bytes.
 * Anything here must be confirmed by `file-type` before it is accepted.
 */
const verifiableTypes = new Set([
  "application/pdf",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/**
 * Plain-text formats have no magic bytes, so they cannot be proven by
 * inspection. They are accepted only if the payload decodes as strict UTF-8 and
 * contains no control characters, and they are always stored as
 * `text/plain; charset=utf-8`.
 *
 * They are never stored as `text/html` or `image/svg+xml`: serving attacker
 * -controlled markup from the app's own origin would be a stored-XSS vector.
 */
const textTypes = new Set(["text/plain", "text/csv", "application/json"]);

function looksLikeText(bytes: Uint8Array): boolean {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Allow tab, newline, and carriage return; reject other C0 controls and NUL.
    return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (!checkRateLimit(`file-upload:${user.id}`, 20).allowed) {
      throw new AppError("RATE_LIMITED");
    }

    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File) || candidate.size === 0) {
      throw new AppError("INVALID_INPUT", "Expected a non-empty file field named 'file'");
    }
    if (candidate.size > maxBytes) {
      throw new AppError("INVALID_INPUT", `File exceeds the ${maxBytes} byte limit`);
    }

    const bytes = new Uint8Array(await candidate.arrayBuffer());
    const detected = await fileTypeFromBuffer(bytes);

    // Resolve the content type from evidence only. The browser-reported
    // `candidate.type` is attacker-controlled and is never used as the answer —
    // at most it selects which text branch to validate.
    let contentType: string;
    let extension: string;

    if (detected && verifiableTypes.has(detected.mime)) {
      contentType = detected.mime;
      extension = detected.ext;
    } else if (!detected && textTypes.has(candidate.type) && looksLikeText(bytes)) {
      contentType = "text/plain; charset=utf-8";
      extension = candidate.type === "text/csv" ? "csv" : candidate.type === "application/json" ? "json" : "txt";
    } else {
      throw new AppError("INVALID_INPUT", "Unsupported file type");
    }

    // The original name is recorded as metadata only. The storage key is
    // generated, so a hostile filename cannot influence the path.
    const originalName = candidate.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
    const uploaded = await storage.upload({
      data: bytes,
      contentType,
      key: `files/${user.id}/${crypto.randomUUID()}.${extension}`,
    });

    return ok({ ...uploaded, originalName }, 201);
  } catch (error) {
    logError("POST /api/uploads/files", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}
