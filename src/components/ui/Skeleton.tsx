import { cn } from '@/lib/utils';

/**
 * Shimmering placeholder block. Compose freely with sizing utilities:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="h-10 w-10 rounded-xl" />
 * The shimmer + theme-aware base colour live in `.skeleton` (index.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}
