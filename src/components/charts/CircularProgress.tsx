import { useEffect, useState } from 'react';

/**
 * Circular progress gauge — the equity and funding dials.
 *
 * The arc animates from zero on mount, which does real work rather than just
 * looking nice: a ring that grows to 16.5% communicates "part-way there" far
 * faster than a static ring the eye has to measure.
 *
 * The animation is skipped entirely when the visitor has asked for reduced
 * motion.
 */

const STROKE = 12;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export function CircularProgress({
  value,
  size = 168,
  color = '#3f7bfd',
  trackColor = 'rgba(148,163,184,0.14)',
  label,
  caption,
  valueLabel,
}: {
  /** Progress as a percentage, 0–100. Values outside are clamped. */
  value: number;
  size?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  caption?: string;
  /** Overrides the figure in the middle. Defaults to the rounded percentage. */
  valueLabel?: string;
}) {
  const target = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const [drawn, setDrawn] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDrawn(target);
      return;
    }

    // One frame of delay so the browser paints the zero state first and the
    // CSS transition actually has something to animate from.
    const frame = requestAnimationFrame(() => setDrawn(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (drawn / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          role="img"
          aria-label={`${label ?? 'Progress'}: ${target.toFixed(2)} percent`}
        >
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={trackColor}
              strokeWidth={STROKE}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-display text-2xl font-bold leading-none tabular-nums text-white">
            {valueLabel ?? `${Number(target.toFixed(2))}%`}
          </p>
          {caption && <p className="mt-1.5 text-[11px] text-slate-400">{caption}</p>}
        </div>
      </div>

      {label && (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
      )}
    </div>
  );
}

/**
 * Horizontal progress bar with an optional target marker.
 *
 * The marker is what turns "you have paid 16.5%" into "you have paid 16.5% of
 * what you committed", which is the question the investor is actually asking.
 */
export function ProgressBar({
  value,
  color = '#3f7bfd',
  height = 8,
  showLabel = false,
  label,
}: {
  value: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showLabel && (
            <span className="text-xs font-semibold tabular-nums text-slate-200">
              {Number(clamped.toFixed(2))}%
            </span>
          )}
        </div>
      )}

      <div
        className="w-full overflow-hidden rounded-full bg-white/[0.08]"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Number(clamped.toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            transition: 'width 800ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </div>
  );
}
