"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * URL-driven pagination.
 *
 * Page state lives in the query string so results are linkable and survive a
 * refresh. Page 1 omits the parameter entirely, keeping canonical URLs clean.
 *
 * Note: `useSearchParams` opts the nearest boundary into client-side rendering, so
 * render this inside a `<Suspense>` boundary if the surrounding page is static.
 */
export function Pagination({
  page,
  totalPages,
  siblings = 2,
}: {
  page: number;
  totalPages: number;
  siblings?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);

  function go(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    const params = new URLSearchParams(searchParams.toString());

    if (target <= 1) params.delete("page");
    else params.set("page", String(target));

    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  }

  const pages: number[] = [];
  for (let p = Math.max(1, current - siblings); p <= Math.min(totalPages, current + siblings); p += 1) {
    pages.push(p);
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={current <= 1}
        onClick={() => go(current - 1)}
        aria-label="Previous page"
      >
        <ChevronLeftIcon />
        Previous
      </Button>

      {pages[0]! > 1 ? <span className="px-2 text-muted-foreground">…</span> : null}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === current ? "default" : "outline"}
          size="sm"
          onClick={() => go(p)}
          aria-label={`Page ${p}`}
          aria-current={p === current ? "page" : undefined}
        >
          {p}
        </Button>
      ))}

      {pages[pages.length - 1]! < totalPages ? (
        <span className="px-2 text-muted-foreground">…</span>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        disabled={current >= totalPages}
        onClick={() => go(current + 1)}
        aria-label="Next page"
      >
        Next
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
