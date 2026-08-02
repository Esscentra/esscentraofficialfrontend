import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up to its value on mount.
 *
 * The easing is `easeOutCubic` on a fixed duration rather than a fixed
 * increment, so ₹25,00,000 and ₹1,200 take the same time to land — a
 * per-step counter would make the large figure crawl.
 *
 * Two behaviours worth keeping:
 *  - It respects `prefers-reduced-motion` and snaps straight to the value.
 *  - It animates FROM the previously displayed value, so a background refresh
 *    that nudges a total ticks up by the difference instead of restarting
 *    from zero and looking like the data was lost.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function AnimatedValue({
  value,
  format,
  duration = 850,
  className = '',
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const target = Number.isFinite(value) ? value : 0;
  const [displayed, setDisplayed] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const fromRef = useRef(displayed);

  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = target;
      setDisplayed(target);
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(progress);

      setDisplayed(next);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return (
    <span className={className} title={format(target)}>
      {format(displayed)}
    </span>
  );
}
