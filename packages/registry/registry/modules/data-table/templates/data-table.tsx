"use client";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (item: T) => string;
  emptyLabel?: string;
}

export function DataTable<T>({ data, columns, rowKey, emptyLabel = "No results." }: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="rounded-xl border bg-white p-8 text-center text-sm text-zinc-500">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-medium ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item) => (
            <tr key={rowKey(item)}>
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className ?? ""}`}>
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}