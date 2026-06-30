import type { LucideIcon } from 'lucide-react';

export type StatTone = 'brand' | 'green' | 'amber' | 'violet' | 'sky';

const TONES: Record<StatTone, string> = {
  brand: 'from-brand-400/30 to-brand-700/15 text-brand-200 ring-brand-400/30',
  green: 'from-emerald-400/30 to-emerald-700/15 text-emerald-200 ring-emerald-400/30',
  amber: 'from-amber-400/30 to-amber-700/15 text-amber-200 ring-amber-400/30',
  violet: 'from-violet-400/30 to-violet-700/15 text-violet-200 ring-violet-400/30',
  sky: 'from-sky-400/30 to-sky-700/15 text-sky-200 ring-sky-400/30',
};

/** Compact KPI card with a gradient icon chip and display-font figure. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        aria-hidden
      />
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ring-1 ${TONES[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display text-[1.6rem] font-bold leading-none tracking-tight text-white tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
