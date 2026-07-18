import type { ReactNode } from 'react';

export type Tone = 'gray' | 'blue' | 'sky' | 'green' | 'amber' | 'red' | 'violet';

const TONES: Record<Tone, { badge: string; dot: string }> = {
  gray: { badge: 'bg-white/10 text-slate-300 ring-white/15', dot: 'bg-slate-400' },
  blue: { badge: 'bg-brand-500/15 text-brand-200 ring-brand-500/30', dot: 'bg-brand-400' },
  sky: { badge: 'bg-sky-500/15 text-sky-300 ring-sky-500/30', dot: 'bg-sky-400' },
  green: { badge: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', dot: 'bg-emerald-400' },
  amber: { badge: 'bg-amber-500/15 text-amber-300 ring-amber-500/30', dot: 'bg-amber-400' },
  red: { badge: 'bg-rose-500/15 text-rose-300 ring-rose-500/30', dot: 'bg-rose-400' },
  violet: { badge: 'bg-violet-500/15 text-violet-300 ring-violet-500/30', dot: 'bg-violet-400' },
};

export function StatusBadge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize leading-none ring-1 ${t.badge}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden />
      {children}
    </span>
  );
}

/** Format an ENUM_VALUE like "IN_PROGRESS" → "in progress". */
export function humanize(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ');
}
