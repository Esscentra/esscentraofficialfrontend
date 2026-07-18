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
      <img
        src="/assets/images/logo.png"
        alt="Esscentra"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 select-none rounded-xl object-contain drop-shadow-[0_4px_12px_rgba(16,91,253,0.4)]"
        draggable={false}
      />
      {withWordmark && (
        <span className="text-gradient font-display text-lg font-bold tracking-tight">
          Esscentra
        </span>
      )}
    </div>
  );
}
