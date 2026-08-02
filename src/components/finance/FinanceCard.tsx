import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { AnimatedValue } from './AnimatedValue';
import { ProgressBar } from '@/components/charts/CircularProgress';
import { cn } from '@/lib/utils';

export type CardTone = 'brand' | 'green' | 'amber' | 'violet' | 'sky' | 'rose' | 'teal';

const TONES: Record<CardTone, { chip: string; glow: string; bar: string }> = {
  brand: {
    chip: 'from-brand-400/30 to-brand-700/15 text-brand-200 ring-brand-400/30',
    glow: 'rgba(47, 109, 240, 0.35)',
    bar: '#3f7bfd',
  },
  green: {
    chip: 'from-emerald-400/30 to-emerald-700/15 text-emerald-200 ring-emerald-400/30',
    glow: 'rgba(16, 185, 129, 0.30)',
    bar: '#22c08a',
  },
  amber: {
    chip: 'from-amber-400/30 to-amber-700/15 text-amber-200 ring-amber-400/30',
    glow: 'rgba(245, 158, 11, 0.30)',
    bar: '#f0b429',
  },
  violet: {
    chip: 'from-violet-400/30 to-violet-700/15 text-violet-200 ring-violet-400/30',
    glow: 'rgba(139, 92, 246, 0.32)',
    bar: '#a78bfa',
  },
  sky: {
    chip: 'from-sky-400/30 to-sky-700/15 text-sky-200 ring-sky-400/30',
    glow: 'rgba(14, 165, 233, 0.30)',
    bar: '#38bdf8',
  },
  rose: {
    chip: 'from-rose-400/30 to-rose-700/15 text-rose-200 ring-rose-400/30',
    glow: 'rgba(244, 63, 94, 0.28)',
    bar: '#fb7185',
  },
  teal: {
    chip: 'from-teal-400/30 to-teal-700/15 text-teal-200 ring-teal-400/30',
    glow: 'rgba(45, 212, 191, 0.30)',
    bar: '#2dd4bf',
  },
};

export interface TrendInfo {
  /** Percentage change against the comparison period. */
  changePercent: number | null;
  label?: string;
  /**
   * Set for metrics where up is bad (expenses). Flips the colour without
   * flipping the arrow — the arrow shows direction, the colour shows meaning.
   */
  invert?: boolean;
}

/**
 * A KPI card: icon, animated figure, label, and an optional trend or progress
 * bar. This is the atom the whole investor dashboard is built from.
 */
export function FinanceCard({
  icon: Icon,
  label,
  value,
  format,
  hint,
  tone = 'brand',
  trend,
  progress,
  footer,
}: {
  icon: LucideIcon;
  label: string;
  /** Pass a number to animate it, or a string to render it verbatim. */
  value: number | string;
  format?: (value: number) => string;
  hint?: string;
  tone?: CardTone;
  trend?: TrendInfo;
  /** 0–100. Renders a progress bar under the figure. */
  progress?: number;
  footer?: React.ReactNode;
}) {
  const t = TONES[tone];

  const change = trend?.changePercent ?? null;
  const isFlat = change === null || Math.abs(change) < 0.05;
  const isUp = change !== null && change > 0;
  // "Good" is direction-aware: expenses rising is not a win.
  const isGood = trend?.invert ? !isUp : isUp;

  const TrendIcon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="glass-card card-lift group relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
        style={{ background: t.glow }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1',
            t.chip,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>

        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold leading-none ring-1',
              isFlat
                ? 'bg-white/[0.06] text-slate-400 ring-white/10'
                : isGood
                  ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/25'
                  : 'bg-rose-500/12 text-rose-300 ring-rose-500/25',
            )}
            title={trend.label}
          >
            <TrendIcon className="h-3 w-3" />
            {isFlat ? 'flat' : `${Math.abs(change).toFixed(1)}%`}
          </span>
        )}
      </div>

      <p className="relative mt-4 font-display text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-white">
        {typeof value === 'number' && format ? (
          <AnimatedValue value={value} format={format} />
        ) : (
          value
        )}
      </p>

      <p className="relative mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      {hint && <p className="relative mt-1 text-[11px] text-slate-500">{hint}</p>}

      {progress !== undefined && (
        <div className="relative mt-3">
          <ProgressBar value={progress} color={t.bar} height={6} />
        </div>
      )}

      {footer && <div className="relative mt-3">{footer}</div>}
    </div>
  );
}
