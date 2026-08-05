import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { requireUser } from "@/infrastructure/auth";
import { storage } from "@/infrastructure/storage";
import { checkRateLimit } from "@/infrastructure/rate-limit";
import { ok, fail } from "@/lib/api-response";
import { AppError, logError, toAppError } from "@/lib/errors";

/**
 * Server-side image processing limits.
 *
 * These are deliberately enforced on the server. The browser-side compression in
 * the uploader component is a UX optimisation and carries no security weight.
 */
const limits = {
  maxInputBytes: 10_000_000,
  maxOutputBytes: 2_000_000,
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 82,
} as const;

/**
 * SVG is excluded on purpose: it is an XML document that can carry script and
 * external references, so it is not safe to serve from the same origin as the
 * app without dedicated sanitisation.
 */
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  try {
    // 1. Identity, verified server-side against the auth provider.
    const user = await requireUser();

    // 2. Abuse control, keyed to the authenticated user rather than an IP.
    if (!checkRateLimit(`image-upload:${user.id}`, 10).allowed) {
      throw new AppError("RATE_LIMITED");
    }

    // 3. Extract the candidate file.
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      throw new AppError("INVALID_INPUT", "Expected a file field named 'file'");
    }
    if (candidate.size === 0 || candidate.size > limits.maxInputBytes) {
      throw new AppError(
        "INVALID_INPUT",
        `File must be between 1 byte and ${limits.maxInputBytes} bytes`,
      );
    }

    const input = new Uint8Array(await candidate.arrayBuffer());

    // 4. Trust the bytes, not the browser. `candidate.type` is client-supplied
    //    and is never consulted.
    const detected = await fileTypeFromBuffer(input);
    if (!detected || !allowedMimeTypes.has(detected.mime)) {
      throw new AppError("INVALID_INPUT", "Unsupported image format");
    }

    // 5. Decode with a pixel ceiling so a small file cannot expand into a
    //    memory-exhausting bitmap (a "decompression bomb").
    const pipeline = sharp(input, { limitInputPixels: 25_000_000 }).rotate();
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) {
      throw new AppError("INVALID_INPUT", "Could not read image dimensions");
    }

    // 6. Re-encode to WebP. Re-encoding also drops EXIF, including GPS data.
    //    `.rotate()` above bakes in the orientation before that metadata is lost.
    const output = await pipeline
      .resize({
        width: limits.maxWidth,
        height: limits.maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: limits.quality })
      .toBuffer();

    if (output.byteLength > limits.maxOutputBytes) {
      throw new AppError("INVALID_INPUT", "Processed image is still too large");
    }

    // 7. Randomised, namespaced key. User input never contributes to the path,
    //    which rules out traversal and collisions.
    const uploaded = await storage.upload({
      data: output,
      contentType: "image/webp",
      key: `images/${user.id}/${crypto.randomUUID()}.webp`,
    });

    return ok(uploaded, 201);
  } catch (error) {
    logError("POST /api/uploads/images", error);
    const appError = toAppError(error);
    return fail(appError.code, appError.message, appError.status, appError.fieldErrors);
  }
}
