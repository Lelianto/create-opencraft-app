"use client";
import { useState } from "react";

export function FileUploader() {
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    setStatus("Uploading…");
    const response = await fetch("/api/uploads/files", { method: "POST", body });
    if (!response.ok) throw new Error("Upload failed");
    const json = (await response.json()) as { data: { url: string } };
    setResult(json.data.url);
    setStatus("Uploaded");
  }

  return (
    <label className="block cursor-pointer rounded-xl border border-dashed p-8 text-center">
      <span>{status || "Choose a file"}</span>
      {result ? (
        <a className="block truncate text-blue-600" href={result} target="_blank" rel="noreferrer">
          {result}
        </a>
      ) : null}
      <input
        className="sr-only"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file).catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Upload failed"));
        }}
      />
    </label>
  );
}