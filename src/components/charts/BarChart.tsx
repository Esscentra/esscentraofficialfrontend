import { useId, useMemo, useState } from 'react';
import { CHROME, axisTicks, niceCeiling } from './chartTheme';
import { inrCompact } from '@/lib/format';

/**
 * ============================================================================
 *  GROUPED BAR CHART — pure SVG, no chart library
 * ============================================================================
 *
 * Built by hand for three reasons: it adds no dependency, it inherits the
 * dashboard's exact palette and type scale, and it can be made properly
 * accessible (every chart here is also a screen-reader table).
 *
 * The chart is responsive through the viewBox rather than a resize observer:
 * it is drawn once at a fixed internal coordinate system and scaled by CSS,
 * so it reflows during a sidebar collapse with no JavaScript at all.
 * ============================================================================
 */

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  /** One value per category, same order as `categories`. */
  values: number[];
}

const VIEW_W = 720;
const VIEW_H = 260;
const PADDING = { top: 16, right: 12, bottom: 34, left: 62 };

export function BarChart({
  categories,
  series,
  formatValue = inrCompact,
  height = 260,
}: {
  categories: string[];
  series: BarSeries[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const plotW = VIEW_W - PADDING.left - PADDING.right;
  const plotH = VIEW_H - PADDING.top - PADDING.bottom;

  const { max, ticks } = useMemo(() => {
    const values = series.flatMap((s) => s.values.map((v) => (Number.isFinite(v) ? v : 0)));
    const peak = Math.max(0, ...values);
    return { max: niceCeiling(peak), ticks: axisTicks(peak) };
  }, [series]);

  const groupWidth = categories.length > 0 ? plotW / categories.length : plotW;
  // Leave a fifth of each slot as breathing room between month groups.
  const barsWidth = groupWidth * 0.68;
  const barWidth = series.length > 0 ? barsWidth / series.length : barsWidth;

  const yOf = (value: number) => PADDING.top + plotH - (value / max) * plotH;

  // Label every category when there is room, otherwise every other one — the
  // alternative is a smear of overlapping month names on a narrow card.
  const labelStride = categories.length > 8 ? Math.ceil(categories.length / 8) : 1;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Bar chart comparing ${series.map((s) => s.label).join(', ')} across ${categories.length} periods`}
        preserveAspectRatio="none"
      >
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.key}
              id={`${gradientId}-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.55" />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines and y-axis labels */}
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

        {/* Bars */}
        {categories.map((category, categoryIndex) => {
          const groupX = PADDING.left + categoryIndex * groupWidth;
          const barsStart = groupX + (groupWidth - barsWidth) / 2;
          const isHovered = hovered === categoryIndex;

          return (
            <g
              key={category}
              onMouseEnter={() => setHovered(categoryIndex)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Invisible hit area so the whole column is hoverable, not
                  just the few pixels a small bar occupies. */}
              <rect
                x={groupX}
                y={PADDING.top}
                width={groupWidth}
                height={plotH}
                fill={isHovered ? 'rgba(148,163,184,0.06)' : 'transparent'}
              />

              {series.map((s, seriesIndex) => {
                const value = Number.isFinite(s.values[categoryIndex])
                  ? (s.values[categoryIndex] as number)
                  : 0;
                const barHeight = max > 0 ? Math.max(0, (value / max) * plotH) : 0;

                return (
                  <rect
                    key={s.key}
                    x={barsStart + seriesIndex * barWidth}
                    // A 2px floor keeps a small-but-real value visible rather
                    // than rendering as nothing at all.
                    y={PADDING.top + plotH - Math.max(barHeight, value > 0 ? 2 : 0)}
                    width={Math.max(1, barWidth - 2)}
                    height={Math.max(barHeight, value > 0 ? 2 : 0)}
                    rx={Math.min(3, barWidth / 3)}
                    fill={`url(#${gradientId}-${s.key})`}
                    opacity={hovered === null || isHovered ? 1 : 0.45}
                    style={{ transition: 'opacity 150ms ease' }}
                  >
                    <title>{`${s.label} — ${category}: ${formatValue(value)}`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotH}
          x2={VIEW_W - PADDING.right}
          y2={PADDING.top + plotH}
          stroke={CHROME.axis}
          strokeWidth="1"
        />

        {/* Category labels */}
        {categories.map((category, index) =>
          index % labelStride === 0 ? (
            <text
              key={category}
              x={PADDING.left + index * groupWidth + groupWidth / 2}
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

      {/* Same data as a table, for screen readers and for anyone who would
          rather read the numbers than the picture. */}
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
