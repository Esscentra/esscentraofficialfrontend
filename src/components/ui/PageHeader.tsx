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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300/90">
            <span
              className="h-px w-6 bg-gradient-to-r from-brand-400 to-transparent"
              aria-hidden
            />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[1.85rem] font-bold leading-tight tracking-tight text-gradient">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
