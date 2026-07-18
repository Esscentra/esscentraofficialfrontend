import type { LucideIcon } from 'lucide-react';

export type StatTone = 'brand' | 'green' | 'amber' | 'violet' | 'sky';

const TONES: Record<StatTone, { chip: string; glow: string }> = {
  brand: {
    chip: 'from-brand-400/30 to-brand-700/15 text-brand-200 ring-brand-400/30',
    glow: 'rgba(47, 109, 240, 0.35)',
  },
  green: {
    chip: 'from-emerald-400/30 to-emerald-700/15 text-emerald-200 ring-emerald-400/30',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  amber: {
    chip: 'from-amber-400/30 to-amber-700/15 text-amber-200 ring-amber-400/30',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  violet: {
    chip: 'from-violet-400/30 to-violet-700/15 text-violet-200 ring-violet-400/30',
    glow: 'rgba(139, 92, 246, 0.32)',
  },
  sky: {
    chip: 'from-sky-400/30 to-sky-700/15 text-sky-200 ring-sky-400/30',
    glow: 'rgba(14, 165, 233, 0.3)',
  },
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
  const t = TONES[tone];
  return (
    <div className="glass-card card-lift group p-5">
      {/* tone-colored corner glow, brightens on hover */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
        style={{ background: t.glow }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ring-1 ${t.chip}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="relative mt-4 font-display text-[1.7rem] font-bold leading-none tracking-tight text-white tabular-nums">
        {value}
      </p>
      <p className="relative mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      {hint && <p className="relative mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
