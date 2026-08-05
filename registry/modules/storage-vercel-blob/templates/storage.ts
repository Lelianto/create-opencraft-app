import "server-only";
import { del, get, head, put } from "@vercel/blob";

/**
 * Vercel Blob storage adapter.
 *
 * ## Public vs private — read before shipping
 *
 * `access` defaults to `"public"` because the common case is displaying an
 * uploaded image in an `<img>` tag, which needs a directly fetchable URL. Vercel
 * Blob public URLs contain a random suffix, so they are unguessable — but they
 * are still **world-readable to anyone who obtains the URL**. There is no
 * per-user authorization on a public blob.
 *
 * For anything sensitive (documents, exports, another user's data) pass
 * `access: "private"` and stream the bytes through your own Route Handler, where
 * you can call `requireUser()` and check ownership first. `readPrivate()` below
 * is the building block for that.
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
  upload(input: UploadInput, options?: { access?: "public" | "private" }): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string | Promise<string>;
}

function toBody(data: UploadInput["data"]): Blob | Buffer {
  if (data instanceof Blob) return data;
  return Buffer.from(data instanceof Uint8Array ? data : new Uint8Array(data));
}

function byteLength(data: UploadInput["data"]): number {
  if (data instanceof Blob) return data.size;
  return data instanceof Uint8Array ? data.byteLength : data.byteLength;
}

export const storage: StorageProvider = {
  async upload(input, options) {
    const key = input.key ?? crypto.randomUUID();

    const result = await put(key, toBody(input.data), {
      access: options?.access ?? "public",
      contentType: input.contentType,
      /*
       * The caller already generates a random key, so a second random suffix is
       * unnecessary — and disabling it keeps `result.pathname` equal to the key
       * we asked for, which is what we store and later delete by.
       */
      addRandomSuffix: false,
    });

    return {
      key: result.pathname,
      url: result.url,
      contentType: input.contentType,
      size: byteLength(input.data),
    };
  },

  async delete(key) {
    await del(key);
  },

  /**
   * Resolve the canonical URL for a stored blob.
   *
   * This performs a metadata lookup rather than guessing a URL from the key —
   * the previous implementation returned the key itself, which was never a
   * working URL.
   */
  async getPublicUrl(key) {
    const metadata = await head(key);
    return metadata.url;
  },
};

/**
 * Read a private blob's bytes on the server.
 *
 * Authorize the caller *before* calling this, then stream the result back:
 *
 * ```ts
 * const user = await requireUser();
 * if (!key.startsWith(`documents/${user.id}/`)) throw new AppError("NOT_FOUND");
 * const { stream, headers } = await readPrivate(key);
 * return new Response(stream, { headers });
 * ```
 */
export async function readPrivate(key: string) {
  return get(key, { access: "private" });
}
