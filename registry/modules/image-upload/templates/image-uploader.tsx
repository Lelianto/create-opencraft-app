"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";

/**
 * Client-side image upload with compression and WebP conversion.
 *
 * ## What this does and does not guarantee
 *
 * Everything here is a **user-experience optimisation**: it shrinks the upload so
 * it transfers faster and is less likely to be rejected. None of it is a security
 * control, because a client can skip this component entirely and post directly to
 * the endpoint.
 *
 * The server re-validates every byte: magic-byte sniffing, MIME allowlist, pixel
 * ceilings, re-encoding, and size caps. See `src/app/api/uploads/images/route.ts`.
 *
 * ## Metadata / EXIF
 *
 * Canvas re-encoding — which is how this library converts formats — discards EXIF,
 * including GPS coordinates, because only raw pixels are drawn and re-encoded.
 * That is a genuine privacy benefit, but do not rely on the client for it: the
 * server re-encodes with sharp, which is what actually guarantees stripped
 * metadata.
 */

export interface ImageProcessingOptions {
  maxInputBytes: number;
  maxOutputBytes: number;
  maxWidth: number;
  maxHeight: number;
  /** 0–1, passed through to the encoder. */
  quality: number;
  outputFormat: "webp";
}

export const defaultImageOptions: ImageProcessingOptions = {
  maxInputBytes: 10_000_000,
  maxOutputBytes: 2_000_000,
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  outputFormat: "webp",
};

/**
 * SVG is excluded deliberately. It is an XML document that can carry script, so
 * it is not safe to treat as an image. The server enforces this too.
 */
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export interface UploadedImage {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export function ImageUploader({
  options = defaultImageOptions,
  onUploaded,
}: {
  options?: ImageProcessingOptions;
  onUploaded?: (file: UploadedImage) => void;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    // Fail fast before spending time compressing.
    if (!acceptedTypes.includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > options.maxInputBytes) {
      setError(`Image must be smaller than ${Math.round(options.maxInputBytes / 1_000_000)} MB.`);
      return;
    }

    try {
      setStatus("processing");

      const compressed = await imageCompression(file, {
        maxSizeMB: options.maxOutputBytes / 1_000_000,
        maxWidthOrHeight: Math.max(options.maxWidth, options.maxHeight),
        initialQuality: options.quality,
        // Converting to WebP is what drops the original container and its EXIF.
        fileType: `image/${options.outputFormat}`,
        // Keeps the main thread responsive on large images.
        useWebWorker: true,
      });

      setStatus("uploading");

      const body = new FormData();
      body.append("file", compressed, `upload.${options.outputFormat}`);

      const response = await fetch("/api/uploads/images", { method: "POST", body });
      const payload = (await response.json()) as ApiResponse<UploadedImage>;

      if (!payload.success) {
        setError(payload.error.message);
        return;
      }

      setPreview(payload.data.url);
      onUploaded?.(payload.data);
    } catch {
      setError("Could not process that image. Please try another file.");
    } finally {
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Choose an image</span>
        <input
          type="file"
          accept={acceptedTypes.join(",")}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset so selecting the same file twice still fires onChange.
            event.target.value = "";
            if (file) void handleFile(file);
          }}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
        />
      </label>

      {busy ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {status === "processing" ? "Compressing…" : "Uploading…"}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-2">
          {/* Plain <img>: the URL is provider-hosted and may not be configured
              in next.config.ts images.remotePatterns. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Uploaded preview" className="max-h-48 rounded-md border" />
          <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
