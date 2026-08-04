"use client";
import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function go(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <button
        className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`rounded-md border px-3 py-1 text-sm ${p === page ? "bg-zinc-900 text-white" : ""}`}
          onClick={() => go(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}