"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchFilter({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value, router, searchParams]);

  return (
    <input
      className="w-full max-w-sm rounded-md border bg-white px-3 py-2 text-sm"
      type="search"
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}