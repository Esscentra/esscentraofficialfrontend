import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  /** Custom cell renderer; defaults to (row[key]) as text. */
  render?: (row: T) => ReactNode;
  className?: string;
}

/** Minimal styled table. Render an <EmptyState/> yourself when `rows` is empty. */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.025] text-[11px] uppercase tracking-[0.08em] text-slate-400">
              {columns.map((c) => (
                <th key={c.key} className={`px-5 py-3.5 font-semibold ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`group border-b border-white/5 text-slate-200 transition-colors duration-150 last:border-0 hover:bg-brand-500/[0.06] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-5 py-3.5 align-middle ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
