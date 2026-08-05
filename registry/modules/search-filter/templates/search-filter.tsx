"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Debounced search box that keeps the term in the URL.
 *
 * The parameter name defaults to `search` to match what the server-side list
 * schemas read (see `productListQuerySchema` in the crud-example module). It was
 * previously `q`, which meant installing this alongside crud-example silently did
 * nothing — the box updated the URL and the server ignored it.
 *
 * Keeping state in the URL means results are shareable and survive a refresh.
 *
 * Note: `useSearchParams` opts the nearest boundary into client-side rendering, so
 * render this inside a `<Suspense>` boundary if the surrounding page is static.
 */
export function SearchFilter({
  paramName = "search",
  placeholder = "Search…",
  debounceMs = 300,
}: {
  paramName?: string;
  placeholder?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentParam = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(currentParam);

  // Only the user's typing should drive navigation. The previous version listed
  // `searchParams` as a dependency while calling `router.replace`, so its own
  // navigation re-triggered the effect.
  const latestParam = useRef(currentParam);
  latestParam.current = currentParam;

  useEffect(() => {
    // Nothing to do when the URL already matches — this also prevents a redundant
    // replace on first mount.
    if (value === latestParam.current) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set(paramName, value);
      else params.delete(paramName);

      // Reset paging whenever the query changes, otherwise page 3 of the old
      // results is requested for a new search.
      params.delete("page");

      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [value, paramName, debounceMs, router]);

  return (
    <Input
      type="search"
      className="max-w-sm"
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
