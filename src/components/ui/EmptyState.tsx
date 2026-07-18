import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-brand-400/15 to-brand-700/5 text-brand-300 ring-1 ring-brand-400/20">
        <span
          className="pointer-events-none absolute -inset-3 rounded-[1.5rem] border border-dashed border-white/10"
          aria-hidden
        />
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
