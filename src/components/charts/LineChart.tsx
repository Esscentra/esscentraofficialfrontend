import { useId, useMemo, useState } from 'react';
import { CHROME, axisTicks, niceCeiling } from './chartTheme';
import { inrCompact } from '@/lib/format';

/**
 * ============================================================================
 *  LINE / AREA CHART — pure SVG
 * ============================================================================
 *
 * One component covers both because an area chart is a line chart with a fill:
 * set `area` on a series and it gains a gradient beneath the stroke. Keeping
 * them together guarantees the two share an axis treatment, which matters when
 * they sit side by side on the Reports page.
 *
 * Lines are drawn with a monotone cubic interpolation rather than raw
 * straight segments. A plain spline overshoots — it would draw a dip below
 * zero between two rising months, implying a loss that never happened.
 * ============================================================================
 */

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  /** Fill the space beneath the line with a gradient. */
  area?: boolean;
  dashed?: boolean;
}

const VIEW_W = 720;
const VIEW_H = 260;
const PADDING = { top: 16, right: 14, bottom: 34, left: 62 };

/**
 * Monotone cubic path through the points.
 *
 * Tangents are clamped so the curve never leaves the interval between two
 * consecutive values — the property that stops a chart of positive numbers
 * from dipping negative between them.
 */
function monotonePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;

  const slopes: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1]!.x - points[i]!.x;
    slopes.push(dx === 0 ? 0 : (points[i + 1]!.y - points[i]!.y) / dx);
  }

  const tangents: number[] = [slopes[0] ?? 0];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = slopes[i - 1]!;
    const next = slopes[i]!;
    // A sign change means a local extremum: flatten so the curve turns
    // through the actual data point instead of overshooting past it.
    tangents.push(previous * next <= 0 ? 0 : (previous + next) / 2);
  }
  tangents.push(slopes[slopes.length - 1] ?? 0);

  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i]!;
    const next = points[i + 1]!;
    const dx = (next.x - current.x) / 3;

    path += ` C ${current.x + dx} ${current.y + tangents[i]! * dx}, ${
      next.x - dx
    } ${next.y - tangents[i + 1]! * dx}, ${next.x} ${next.y}`;
  }

  return path;
}

export function LineChart({
  categories,
  series,
  formatValue = inrCompact,
  height = 260,
  showDots = true,
}: {
  categories: string[];
  series: LineSeries[];
  formatValue?: (value: number) => string;
  height?: number;
  showDots?: boolean;
}) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const plotW = VIEW_W - PADDING.left - PADDING.right;
  const plotH = VIEW_H - PADDING.top - PADDING.bottom;

  const { max, min, ticks } = useMemo(() => {
    const values = series.flatMap((s) => s.values.filter(Number.isFinite));
    const peak = Math.max(0, ...values);
    const trough = Math.min(0, ...values);

    return {
      max: niceCeiling(peak),
      // A loss-making month has to be drawable, so the floor goes negative
      // only when the data actually does.
      min: trough < 0 ? -niceCeiling(Math.abs(trough)) : 0,
      ticks: axisTicks(peak, trough),
    };
  }, [series]);

  const span = max - min || 1;
  const stepX = categories.length > 1 ? plotW / (categories.length - 1) : 0;

  const xOf = (index: number) =>
    categories.length > 1 ? PADDING.left + index * stepX : PADDING.left + plotW / 2;
  const yOf = (value: number) =>
    PADDING.top + plotH - ((value - min) / span) * plotH;

  const zeroY = yOf(0);
  const labelStride = categories.length > 8 ? Math.ceil(categories.length / 8) : 1;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Line chart of ${series.map((s) => s.label).join(', ')} over ${categories.length} periods`}
        preserveAspectRatio="none"
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={yOf(tick)}
              x2={VIEW_W - PADDING.right}
              y2={yOf(tick)}
              stroke={CHROME.grid}
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 10}
              y={yOf(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill={CHROME.labelMuted}
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {/* The zero line is emphasised when the chart crosses it, so a loss
            reads as "below the line" at a glance. */}
        {min < 0 && (
          <line
            x1={PADDING.left}
            y1={zeroY}
            x2={VIEW_W - PADDING.right}
            y2={zeroY}
            stroke={CHROME.axis}
            strokeWidth="1.5"
          />
        )}

        {series.map((s) => {
          const points = s.values.map((value, index) => ({
            x: xOf(index),
            y: yOf(Number.isFinite(value) ? value : 0),
          }));
          const path = monotonePath(points);

          return (
            <g key={s.key}>
              {s.area && points.length > 1 && (
                <path
                  d={`${path} L ${points[points.length - 1]!.x} ${zeroY} L ${points[0]!.x} ${zeroY} Z`}
                  fill={`url(#${gradientId}-${s.key})`}
                />
              )}
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? '6 5' : undefined}
              />
              {showDots &&
                points.map((point, index) => (
                  <circle
                    key={`${s.key}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={hovered === index ? 4.5 : 3}
                    fill="#0b1120"
                    stroke={s.color}
                    strokeWidth="2"
                    style={{ transition: 'r 120ms ease' }}
                  >
                    <title>{`${s.label} — ${categories[index]}: ${formatValue(
                      s.values[index] ?? 0,
                    )}`}</title>
                  </circle>
                ))}
            </g>
          );
        })}

        {/* Hover columns: a full-height strip per period, so the tooltip is
            reachable without having to land on a 3px dot. */}
        {categories.map((category, index) => (
          <rect
            key={category}
            x={xOf(index) - stepX / 2}
            y={PADDING.top}
            width={stepX || plotW}
            height={plotH}
            fill={hovered === index ? 'rgba(148,163,184,0.06)' : 'transparent'}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        <line
          x1={PADDING.left}
          y1={PADDING.top + plotH}
          x2={VIEW_W - PADDING.right}
          y2={PADDING.top + plotH}
          stroke={CHROME.axis}
          strokeWidth="1"
        />

        {categories.map((category, index) =>
          index % labelStride === 0 ? (
            <text
              key={category}
              x={xOf(index)}
              y={VIEW_H - 12}
              textAnchor="middle"
              fontSize="11"
              fill={hovered === index ? '#e2e8f0' : CHROME.labelMuted}
            >
              {category}
            </text>
          ) : null,
        )}
      </svg>

      <table className="sr-only">
        <caption>Chart data</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={category}>
              <th scope="row">{category}</th>
              {series.map((s) => (
                <td key={s.key}>{formatValue(s.values[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
