import type { ReactNode } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { periodKeyLabel, recentPeriodKeys } from '@/lib/format';

/**
 * Shared controls for the finance pages: date-range filtering, month picking,
 * and the export cluster.
 */

/** A labelled select styled to match the existing form controls. */
export function SelectControl({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="select-field h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none transition focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/25"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A labelled date input. */
export function DateControl({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none transition [color-scheme:dark] focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/25"
      />
    </label>
  );
}

/** A month picker over the last N months. */
export function PeriodPicker({
  value,
  onChange,
  months = 18,
  label = 'Period',
}: {
  value: string;
  onChange: (value: string) => void;
  months?: number;
  label?: string;
}) {
  return (
    <SelectControl
      label={label}
      value={value}
      onChange={onChange}
      options={recentPeriodKeys(months).map((key) => ({
        value: key,
        label: periodKeyLabel(key),
      }))}
    />
  );
}

export interface DateRange {
  from: string;
  to: string;
}

/**
 * A from/to filter with quick presets.
 *
 * The presets exist because "this financial year" in India runs April to
 * March, not January to December, and asking an Indian founder to key those
 * dates by hand every time is a small daily insult.
 */
export function RangeFilter({
  range,
  onChange,
  extra,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  extra?: ReactNode;
}) {
  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  const presets: Array<{ label: string; range: DateRange }> = [
    { label: 'All time', range: { from: '', to: '' } },
    {
      label: 'This month',
      range: {
        from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: iso(today),
      },
    },
    {
      label: 'Last 3 months',
      range: {
        from: iso(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
        to: iso(today),
      },
    },
    {
      label: 'This FY',
      range: {
        // Indian financial year: 1 April to 31 March.
        from: iso(
          new Date(
            today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1,
            3,
            1,
          ),
        ),
        to: iso(today),
      },
    },
  ];

  const activePreset = presets.find(
    (preset) => preset.range.from === range.from && preset.range.to === range.to,
  );

  return (
    <div className="glass-card flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.range)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activePreset?.label === preset.label
                ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/35'
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex flex-wrap items-end gap-3">
        <DateControl
          label="From"
          value={range.from}
          max={range.to || undefined}
          onChange={(from) => onChange({ ...range, from })}
        />
        <DateControl
          label="To"
          value={range.to}
          onChange={(to) => onChange({ ...range, to })}
        />
        {extra}
      </div>
    </div>
  );
}

/**
 * The export cluster.
 *
 * PDF is produced by the browser's print dialogue against a print stylesheet
 * rather than by a server-side renderer, so the document the investor saves is
 * exactly the page they are looking at — same figures, same layout, no
 * separate template to drift out of sync.
 */
export function ExportButtons({
  onCsv,
  onExcel,
  onPdf,
  busy,
}: {
  onCsv?: () => void;
  onExcel?: () => void;
  onPdf?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {onCsv && (
        <Button variant="secondary" size="sm" onClick={onCsv} disabled={busy}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      )}
      {onExcel && (
        <Button variant="secondary" size="sm" onClick={onExcel} disabled={busy}>
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
      )}
      {onPdf && (
        <Button variant="secondary" size="sm" onClick={onPdf} disabled={busy}>
          <Printer className="h-4 w-4" />
          PDF
        </Button>
      )}
    </div>
  );
}

/** A small pill for a status value. */
export function Pill({
  tone = 'gray',
  children,
}: {
  tone?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal';
  children: ReactNode;
}) {
  const tones = {
    gray: 'bg-white/10 text-slate-300 ring-white/15',
    blue: 'bg-brand-500/15 text-brand-200 ring-brand-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    red: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    violet: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
    teal: 'bg-teal-500/15 text-teal-300 ring-teal-500/30',
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Map a backend status enum to a pill colour. */
export function statusTone(
  status?: string | null,
): 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' {
  switch (status) {
    case 'RECEIVED':
    case 'APPROVED':
    case 'PAID':
    case 'COMPLETED':
    case 'ACTIVE':
      return 'green';
    case 'PENDING':
    case 'DRAFT':
      return 'amber';
    case 'OVERDUE':
    case 'REJECTED':
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
}

/** A titled section wrapper, for grouping cards and tables on a page. */
export function Section({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
            <FileText className="h-4 w-4 text-brand-300" aria-hidden />
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
