import { useEffect, useState } from 'react';
import { cn, initials } from '@/lib/utils';

/**
 * Profile picture with an initials fallback.
 *
 * The fallback covers three cases, not just "no photo set":
 *   1. the user never uploaded one,
 *   2. the stored URL is dead — e.g. the Cloudinary asset was deleted but the
 *      URL is still on the user record, which otherwise renders a broken
 *      image icon and a 404 in the console,
 *   3. the image fails to load for any transient reason.
 *
 * `src` is tracked in state so a changed URL (after an upload) clears a
 * previous error and retries.
 */
export function Avatar({
  src,
  name,
  className = 'h-9 w-9',
  textClassName = 'text-xs',
  rounded = 'rounded-xl',
}: {
  src?: string | null;
  name?: string | null;
  /** Size utilities — defaults to a 36px square. */
  className?: string;
  /** Font size for the initials fallback. */
  textClassName?: string;
  rounded?: string;
}) {
  const [broken, setBroken] = useState(false);
  const label = name ?? '';

  // A new URL deserves a fresh attempt.
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const showImage = !!src && !broken;

  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-brand-400 to-brand-700 font-bold !text-white ring-1 ring-white/20',
        rounded,
        textClassName,
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={label}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(label)
      )}
    </div>
  );
}
