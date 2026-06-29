import { cn } from '@/lib/utils';

export function Logo({
  withWordmark = true,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-700 shadow-lg shadow-brand-900/40">
        <svg viewBox="0 0 64 64" className="h-5 w-5">
          <path
            d="M40 20H26a6 6 0 0 0-6 6 6 6 0 0 0 6 6h8a6 6 0 0 1 6 6 6 6 0 0 1-6 6H22"
            fill="none"
            stroke="white"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </div>
      {withWordmark && (
        <span className="bg-gradient-to-r from-white to-brand-200 bg-clip-text font-display text-lg font-bold tracking-tight text-transparent">
          Esscentra
        </span>
      )}
    </div>
  );
}
