/**
 * ============================================================================
 *  CHART THEME
 * ============================================================================
 *
 * A single palette shared by every chart, so revenue is the same blue on the
 * bar chart, the area chart and the legend. Colours are tuned for the dark
 * glass surface these charts sit on.
 *
 * Semantic series (revenue / expenses / profit) get FIXED colours rather than
 * positional ones. A reader should never have to check the legend twice to
 * learn that the red band is still expenses.
 * ============================================================================
 */

/** Fixed colours for the recurring financial series. */
export const SERIES = {
  revenue: '#3f7bfd',
  expenses: '#e8734a',
  netProfit: '#22c08a',
  investorProfit: '#a78bfa',
  founderProfit: '#38bdf8',
  investment: '#f0b429',
  valuation: '#6366f1',
  distributed: '#2dd4bf',
} as const;

export type SeriesKey = keyof typeof SERIES;

/**
 * Categorical slots for data whose categories are not known ahead of time —
 * clients, expense categories. Ordered so neighbouring slices stay
 * distinguishable, including for the most common colour-vision deficiencies.
 */
export const CATEGORICAL = [
  '#3f7bfd',
  '#22c08a',
  '#f0b429',
  '#a78bfa',
  '#38bdf8',
  '#e8734a',
  '#2dd4bf',
  '#f472b6',
  '#94a3b8',
] as const;

/** Pick a stable categorical colour by index. */
export function categoricalColor(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length]!;
}

/** Neutral chrome: axes, gridlines, labels. */
export const CHROME = {
  grid: 'rgba(148, 163, 184, 0.14)',
  axis: 'rgba(148, 163, 184, 0.28)',
  label: 'rgba(148, 163, 184, 0.85)',
  labelMuted: 'rgba(100, 116, 139, 0.9)',
} as const;

/**
 * Round an axis maximum up to a readable ceiling — 1, 2, 2.5 or 5 × a power of
 * ten. Without this the y-axis tops out at values like ₹87,431, which nobody
 * can read a bar against.
 */
export function niceCeiling(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalised = max / magnitude;

  const step =
    normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;

  return step * magnitude;
}

/**
 * Evenly spaced tick values from 0 (or a negative floor) to the ceiling.
 * Four intervals is the sweet spot: enough to read a value off, few enough
 * that the labels never collide on a narrow card.
 */
export function axisTicks(max: number, min = 0, intervals = 4): number[] {
  const ceiling = niceCeiling(max);
  const floor = min < 0 ? -niceCeiling(Math.abs(min)) : 0;
  const span = ceiling - floor;

  return Array.from(
    { length: intervals + 1 },
    (_, index) => floor + (span * index) / intervals,
  );
}
