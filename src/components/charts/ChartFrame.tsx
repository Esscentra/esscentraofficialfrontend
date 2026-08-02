import type { ReactNode } from 'react';
import { CHROME } from './chartTheme';

/**
 * The shared chrome every chart sits inside: a titled card, a legend, and an
 * explicit empty state.
 *
 * Pulling this out means an empty chart renders as "No data for this period"
 * rather than as a set of axes around nothing, which is the single most common
 * way a dashboard looks broken when it is merely new.
 */

export interface LegendItem {
  label: string;
  color: string;
  /** Optional value shown next to the label, e.g. a total. */
  value?: string;
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="text-slate-400">{item.label}</span>
          {item.value && (
            <span className="font-semibold tabular-nums text-slate-200">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ChartFrame({
  title,
  subtitle,
  legend,
  action,
  isEmpty,
  emptyMessage = 'No data for this period yet.',
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  legend?: LegendItem[];
  action?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-card p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
            )}
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      {isEmpty ? (
        <div
          className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm text-slate-500"
          style={{ borderColor: CHROME.grid }}
        >
          {emptyMessage}
        </div>
      ) : (
        <>
          {children}
          {legend && legend.length > 0 && (
            <footer className="mt-4 border-t border-white/5 pt-3">
              <ChartLegend items={legend} />
            </footer>
          )}
        </>
      )}
    </section>
  );
}
