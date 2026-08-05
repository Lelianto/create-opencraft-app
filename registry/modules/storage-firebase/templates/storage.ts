import "server-only";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/infrastructure/auth";
import { AppError } from "@/lib/errors";

/**
 * Firebase Storage (Google Cloud Storage) adapter.
 *
 * ## Keep objects private
 *
 * Objects are **not** made public. Access is granted through short-lived V4
 * signed URLs, so a leaked URL expires instead of exposing the object forever.
 *
 * `makePublic()` is intentionally not used: it grants `allUsers` read access with
 * no expiry and no per-user authorization.
 *
 * Storage Security Rules govern the *client* SDK. The Admin SDK used here
 * bypasses them, so keep both: rules as the backstop, and the ownership checks in
 * your Route Handlers as the real control. Suggested rules:
 *
 * ```
 * rules_version = '2';
 * service firebase.storage {
 *   match /b/{bucket}/o {
 *     match /images/{userId}/{file} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /{allPaths=**} { allow read, write: if false; }
 *   }
 * }
 * ```
 */
export interface UploadInput {
  data: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
  key?: string;
}

export interface UploadedFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string | Promise<string>;
}

/** Signed URL lifetime in milliseconds. Keep it short. */
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

function bucket() {
  // Defaults to <project-id>.firebasestorage.app unless overridden.
  const name = process.env.FIREBASE_STORAGE_BUCKET;
  return name ? getStorage(getAdminApp()).bucket(name) : getStorage(getAdminApp()).bucket();
}

async function toBuffer(data: UploadInput["data"]): Promise<Buffer> {
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer());
  return Buffer.from(data instanceof Uint8Array ? data : new Uint8Array(data));
}

export const storage: StorageProvider = {
  async upload(input) {
    const key = input.key ?? crypto.randomUUID();
    const body = await toBuffer(input.data);

    try {
      const file = bucket().file(key);
      await file.save(body, {
        contentType: input.contentType,
        resumable: false,
        // Long cache is safe because keys are random and never reused.
        metadata: { cacheControl: "private, max-age=31536000" },
      });

      return {
        key,
        url: await getSignedUrl(key),
        contentType: input.contentType,
        size: body.byteLength,
      };
    } catch (error) {
      throw new AppError("INTERNAL", "Upload failed", undefined, error);
    }
  },

  async delete(key) {
    try {
      // `ignoreNotFound` keeps deletion idempotent.
      await bucket().file(key).delete({ ignoreNotFound: true });
    } catch (error) {
      throw new AppError("INTERNAL", "Delete failed", undefined, error);
    }
  },

  /**
   * Objects here are private, so there is no durable public URL. This returns a
   * signed URL; treat it as short-lived and never persist it in a database.
   */
  getPublicUrl(key) {
    return getSignedUrl(key);
  },
};

/** Short-lived V4 signed URL. Authorize the caller before issuing one. */
export async function getSignedUrl(key: string, ttlMs = SIGNED_URL_TTL_MS): Promise<string> {
  try {
    const [url] = await bucket().file(key).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + ttlMs,
    });
    return url;
  } catch (error) {
    throw new AppError("INTERNAL", "Could not sign URL", undefined, error);
  }
}
