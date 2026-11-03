import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Logos for sub-products that have one, by slug. Files live in
 * public/platforms. A platform not listed here, or whose file fails to load,
 * falls back to a lettered badge.
 */
const PLATFORM_LOGOS: Record<string, string> = {
  esscentraprep: '/platforms/esscentraprep.webp',
};

/** A stable gradient per platform, so lettered badges are told apart. */
const BADGES = [
  'from-brand-400 to-brand-700',
  'from-violet-400 to-violet-700',
  'from-emerald-400 to-emerald-700',
  'from-amber-400 to-amber-600',
  'from-sky-400 to-sky-700',
  'from-rose-400 to-rose-600',
];

function badgeFor(slug: string): string {
  const sum = [...slug].reduce((total, char) => total + char.charCodeAt(0), 0);
  return BADGES[sum % BADGES.length]!;
}

export function PlatformLogo({
  slug,
  name,
  className,
  letterClassName,
}: {
  slug: string;
  name: string;
  /** Size and shape, e.g. "h-16 w-16 rounded-2xl". */
  className?: string;
  /** Font size for the lettered fallback. */
  letterClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = PLATFORM_LOGOS[slug];

  if (src && !failed) {
    // White behind the mark keeps a blue logo readable on the dark theme.
    return (
      <span className={cn('grid shrink-0 place-items-center overflow-hidden bg-white shadow-sm', className)}>
        <img
          src={src}
          alt={`${name} logo`}
          className="h-[88%] w-[88%] object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center bg-gradient-to-br font-bold text-white shadow-sm',
        badgeFor(slug),
        className,
        letterClassName,
      )}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
