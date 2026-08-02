import { useMemo, useState } from 'react';
import { categoricalColor } from './chartTheme';
import { inrCompact } from '@/lib/format';

/**
 * ============================================================================
 *  DONUT / PIE CHART — pure SVG
 * ============================================================================
 *
 * A donut rather than a solid pie: the hole is where the total goes, which is
 * the number most readers are actually looking for. Slices are drawn as arcs
 * on a single circle using stroke-dasharray, which is both cheaper than
 * building path arcs and animates cleanly.
 *
 * Slices below a threshold are not dropped — they are drawn at a minimum
 * visible width, because "too small to see" and "zero" mean very different
 * things on a financial breakdown.
 * ============================================================================
 */

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

const SIZE = 200;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({
  slices,
  formatValue = inrCompact,
  centerLabel = 'Total',
  size = 200,
}: {
  slices: DonutSlice[];
  formatValue?: (value: number) => string;
  centerLabel?: string;
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { segments, total } = useMemo(() => {
    const positive = slices
      .map((slice, index) => ({
        ...slice,
        value: Math.max(0, Number.isFinite(slice.value) ? slice.value : 0),
        color: slice.color ?? categoricalColor(index),
      }))
      .filter((slice) => slice.value > 0);

    const sum = positive.reduce((acc, slice) => acc + slice.value, 0);
    if (sum <= 0) return { segments: [], total: 0 };

    let offset = 0;
    const built = positive.map((slice) => {
      const fraction = slice.value / sum;
      // Floor at 1.2% of the ring so a genuinely tiny slice is still a
      // visible sliver rather than a hairline nobody notices.
      const drawn = Math.max(fraction, 0.012);
      const segment = {
        ...slice,
        fraction,
        percent: fraction * 100,
        dash: drawn * CIRCUMFERENCE,
        offset: offset * CIRCUMFERENCE,
      };
      offset += fraction;
      return segment;
    });

    return { segments: built, total: sum };
  }, [slices]);

  if (segments.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center text-sm text-slate-500">
        Nothing to break down yet.
      </div>
    );
  }

  const focused = hovered !== null ? segments[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={size}
          height={size}
          role="img"
          aria-label={`Breakdown of ${formatValue(total)} across ${segments.length} categories`}
        >
          {/* -90° start so the first slice begins at 12 o'clock, which is
              where a reader expects a breakdown to start. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(148,163,184,0.10)"
              strokeWidth={STROKE}
            />
            {segments.map((segment, index) => (
              <circle
                key={segment.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={hovered === index ? STROKE + 5 : STROKE}
                strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
                strokeDashoffset={-segment.offset}
                opacity={hovered === null || hovered === index ? 1 : 0.4}
                style={{ transition: 'stroke-width 150ms ease, opacity 150ms ease' }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${segment.label}: ${formatValue(segment.value)} (${segment.percent.toFixed(1)}%)`}</title>
              </circle>
            ))}
          </g>
        </svg>

        {/* The hole shows the total, and swaps to the hovered slice so the
            reader never has to look away to read a value. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {focused ? focused.label : centerLabel}
          </p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-white">
            {formatValue(focused ? focused.value : total)}
          </p>
          {focused && (
            <p className="text-[11px] tabular-nums text-slate-400">
              {focused.percent.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((segment, index) => (
          <li
            key={segment.label}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors"
            style={{
              background: hovered === index ? 'rgba(148,163,184,0.07)' : 'transparent',
            }}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: segment.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
              {segment.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
              {formatValue(segment.value)}
            </span>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
              {segment.percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
