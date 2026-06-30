import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Small uppercase label shown above the title. */
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/90">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[1.7rem] font-bold leading-tight tracking-tight text-gradient">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
