import "server-only";
import { createSupabaseServerClient } from "@/infrastructure/auth";
import { AppError } from "@/lib/errors";

/**
 * Supabase Storage adapter.
 *
 * ## Keep the bucket private
 *
 * Create the bucket as **private** and serve files through short-lived signed
 * URLs (`getSignedUrl` below). A public bucket makes every object readable by
 * anyone with the URL, with no per-user authorization.
 *
 * If you do make a bucket public, add Storage RLS policies so writes remain
 * owner-scoped. Suggested policies (SQL editor):
 *
 * ```sql
 * -- Users may only write inside a folder named after their own user id.
 * create policy "own_folder_insert" on storage.objects for insert to authenticated
 *   with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
 *
 * create policy "own_folder_select" on storage.objects for select to authenticated
 *   using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
 *
 * create policy "own_folder_delete" on storage.objects for delete to authenticated
 *   using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
 * ```
 *
 * The upload routes generate keys as `<prefix>/<userId>/<uuid>`, which lines up
 * with those policies.
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

/** Bucket name is a constant, never taken from user input. */
export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

/** Signed URL lifetime in seconds. Keep it short. */
const SIGNED_URL_TTL = 60 * 10;

function byteLength(data: UploadInput["data"]): number {
  if (data instanceof Blob) return data.size;
  return data.byteLength;
}

async function toUploadBody(data: UploadInput["data"]): Promise<Blob | Uint8Array> {
  if (data instanceof Blob) return data;
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export const storage: StorageProvider = {
  async upload(input) {
    const supabase = await createSupabaseServerClient();
    const key = input.key ?? crypto.randomUUID();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, await toUploadBody(input.data), {
        contentType: input.contentType,
        // Never silently replace an existing object.
        upsert: false,
      });

    if (error) throw new AppError("INTERNAL", "Upload failed", undefined, error);

    return {
      key,
      // Signed rather than public, matching the private-bucket default above.
      url: await getSignedUrl(key),
      contentType: input.contentType,
      size: byteLength(input.data),
    };
  },

  async delete(key) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(BUCKET).remove([key]);
    if (error) throw new AppError("INTERNAL", "Delete failed", undefined, error);
  },

  /**
   * Only meaningful for a public bucket. For a private bucket (the default here)
   * use `getSignedUrl` instead — this URL will 400.
   */
  getPublicUrl(key) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return `${base}/storage/v1/object/public/${BUCKET}/${key}`;
  },
};

/** Short-lived URL for a private object. Authorize the caller before issuing one. */
export async function getSignedUrl(key: string, expiresIn = SIGNED_URL_TTL): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, expiresIn);

  if (error || !data) throw new AppError("INTERNAL", "Could not sign URL", undefined, error);
  return data.signedUrl;
}
