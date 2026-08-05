"use client";

import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic table built on the vendored shadcn primitives.
 *
 * Uses theme tokens rather than hardcoded colours, so it follows light/dark mode.
 * The previous version rendered a raw `<table>` with `bg-white` and `text-zinc-500`
 * baked in, which broke in dark mode and diverged from the rest of the UI.
 *
 * Pass only data the caller is authorised to see. This component performs no
 * filtering — authorization belongs in the Route Handler or Server Component that
 * loaded the rows.
 */
export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  emptyLabel = "No results.",
  loading = false,
  skeletonRows = 3,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (item: T) => string;
  emptyLabel?: string;
  loading?: boolean;
  skeletonRows?: number;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.headerClassName}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={rowKey(item)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.cell(item)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
