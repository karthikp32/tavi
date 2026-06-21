import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
}

export function Table<T>({ columns, rows, getRowKey }: TableProps<T>) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-tavi-navy/10 text-left text-tavi-navy/60">
          {columns.map((column) => (
            <th key={column.key} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)} className="border-b border-tavi-navy/5">
            {columns.map((column) => (
              <td key={column.key} className="px-3 py-2 text-tavi-navy">
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
