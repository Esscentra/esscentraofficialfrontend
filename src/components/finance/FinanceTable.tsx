import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

/**
 * A data table that handles its own empty state and knows which columns hold
 * money.
 *
 * `align: 'right'` is not cosmetic: currency columns are right-aligned and
 * tabular-numbered so digits line up vertically, which is what makes a column
 * of rupee figures scannable rather than a ragged wall of text.
 */

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Right-aligns and applies tabular numerals. */
  numeric?: boolean;
  /** Hidden below the `sm` breakpoint, for secondary columns. */
  hideOnMobile?: boolean;
  width?: string;
}

export function FinanceTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  footer,
  maxHeight,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  /** A totals row, rendered sticky at the foot of the table. */
  footer?: ReactNode;
  maxHeight?: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-brand-400/15 to-brand-700/5 text-brand-300 ring-1 ring-brand-400/20">
          <Inbox className="h-6 w-6" />
        </span>
        <h3 className="mt-1 text-base font-semibold text-white">{emptyTitle}</h3>
        {emptyMessage && (
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">{emptyMessage}</p>
        )}
      </div>
    );
  }

  const cellClass = (column: TableColumn<T>) =>
    [
      'px-5 py-3.5 align-middle',
      column.numeric || column.align === 'right'
        ? 'text-right tabular-nums'
        : column.align === 'center'
          ? 'text-center'
          : 'text-left',
      column.hideOnMobile ? 'hidden sm:table-cell' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="glass-card overflow-hidden">
      <div
        className="overflow-x-auto"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#0a1122]/95 text-[11px] uppercase tracking-[0.08em] text-slate-400 backdrop-blur">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${cellClass(column)} font-semibold`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-white/5 text-slate-200 transition-colors duration-150 last:border-0 hover:bg-brand-500/[0.06] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cellClass(column)}>
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {footer && (
            <tfoot className="sticky bottom-0">
              <tr className="border-t border-white/10 bg-[#0a1122]/95 font-semibold text-white backdrop-blur">
                {footer}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/** A totals cell, matching the alignment rules above. */
export function TotalCell({
  children,
  numeric = true,
  colSpan,
  hideOnMobile = false,
}: {
  children: ReactNode;
  numeric?: boolean;
  colSpan?: number;
  /** Match a hideOnMobile column so the totals row stays aligned on phones. */
  hideOnMobile?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-5 py-3.5 ${numeric ? 'text-right tabular-nums' : 'text-left'} ${
        hideOnMobile ? 'hidden sm:table-cell' : ''
      }`}
    >
      {children}
    </td>
  );
}
