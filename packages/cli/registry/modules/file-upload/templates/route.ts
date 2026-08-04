import { fileTypeFromBuffer } from "file-type";
import { ok, fail } from "@/lib/api-response";
import { checkRateLimit } from "@/infrastructure/rate-limit";
import { storage } from "@/infrastructure/storage";

const allowedMime = new Set([
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/json",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const maxBytes = 10_000_000;

export async function POST(request: Request) {
  try {
    const actor = request.headers.get("x-authenticated-user");
    if (!actor) return fail("UNAUTHENTICATED", "Authentication required", 401);
    if (!checkRateLimit(`file:${actor}`, 20).allowed) return fail("RATE_LIMITED", "Try again later", 429);

    const body = await request.formData();
    const value = body.get("file");
    if (!(value instanceof File) || value.size === 0) return fail("INVALID_FILE", "Invalid file", 400);
    if (value.size > maxBytes) return fail("FILE_TOO_LARGE", "File exceeds 10 MB", 413);

    const input = new Uint8Array(await value.arrayBuffer());
    const detected = await fileTypeFromBuffer(input);
    const mime = detected?.mime ?? value.type;
    if (!allowedMime.has(mime)) return fail("INVALID_FILE", "Unsupported file type", 400);

    const safeName = value.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
    const extension = detected?.ext ?? "bin";
    const uploaded = await storage.upload({
      data: input,
      contentType: mime,
      key: `files/${crypto.randomUUID()}-${safeName || `file.${extension}`}`,
    });
    return ok({ key: uploaded.key, url: uploaded.url, contentType: mime, size: input.byteLength, originalName: safeName }, 201);
  } catch {
    console.error("File upload failed");
    return fail("UPLOAD_FAILED", "Unable to upload file", 500);
  }
}