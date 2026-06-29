import type { ReactNode } from 'react';

export type Tone = 'gray' | 'blue' | 'sky' | 'green' | 'amber' | 'red' | 'violet';

const TONES: Record<Tone, string> = {
  gray: 'bg-white/10 text-slate-300 ring-white/15',
  blue: 'bg-brand-500/15 text-brand-200 ring-brand-500/30',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  red: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
};

export function StatusBadge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Format an ENUM_VALUE like "IN_PROGRESS" → "in progress". */
export function humanize(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ');
}
