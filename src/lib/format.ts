/**
 * ============================================================================
 *  FORMATTING — rupees, percentages and dates, the Indian way
 * ============================================================================
 *
 * Every figure on the investor dashboard passes through this file. Centralised
 * because Indian digit grouping is 2-2-3, not 3-3-3: ₹1,00,000 and ₹2,50,00,000
 * are correct, ₹100,000 and ₹25,000,000 are not — and a dashboard that mixes
 * the two reads as sloppy to exactly the audience it is trying to reassure.
 *
 * `Intl.NumberFormat` instances are expensive to build, so they are created
 * once at module scope rather than inside a render.
 * ============================================================================
 */

const INR_WHOLE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR_EXACT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_IN = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Anything that arrived over the wire and should be treated as a number. */
export function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Rupees, rounded to whole units: ₹1,00,000.
 * The default everywhere, because paise on a valuation is noise.
 */
export function inr(value: unknown): string {
  return INR_WHOLE.format(num(value));
}

/** Rupees to the paisa: ₹1,983.84. Used where the exact figure is the point. */
export function inrExact(value: unknown): string {
  return INR_EXACT.format(num(value));
}

/**
 * Rupees in Indian short-scale: ₹9.2L, ₹2.5Cr.
 *
 * Hand-rolled rather than `notation: 'compact'`, because the browser's compact
 * notation produces "₹2.5M" — a unit an Indian founder does not think in.
 */
export function inrCompact(value: unknown): string {
  const amount = num(value);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs >= 10_000_000) return `${sign}₹${trim(abs / 10_000_000)}Cr`;
  if (abs >= 100_000) return `${sign}₹${trim(abs / 100_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;

  return `${sign}₹${NUMBER_IN.format(abs)}`;
}

/** One decimal place, but only when it says something: 2.5 / 9 / 1.6. */
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Plain grouped number, no currency symbol. */
export function count(value: unknown): string {
  return NUMBER_IN.format(num(value));
}

/**
 * A percentage with just enough precision: 10% / 1.6532% / 16.53%.
 *
 * Trailing zeros are trimmed so a clean 10% never renders as "10.0000%", but
 * genuine precision survives — 1.6532% is the whole reason the investor can
 * see that ₹16,532 bought them something.
 */
export function percent(value: unknown, maxDp = 4): string {
  const amount = num(value);
  const rounded = Number(amount.toFixed(maxDp));
  return `${rounded}%`;
}

/** ROI and margins, which read better at two places: 2400% / -8.35%. */
export function percentShort(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const amount = num(value);
  return `${Number(amount.toFixed(2))}%`;
}

/** A signed figure, for deltas: +₹12,000 / -₹3,500. */
export function signedInr(value: unknown): string {
  const amount = num(value);
  return `${amount > 0 ? '+' : ''}${inr(amount)}`;
}

/* ------------------------------- dates ---------------------------------- */

/** 02 Aug 2026 — the format used in every table and timeline. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** 02 Aug 2026, 4:30 pm — where the time of day matters. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "3 days ago" / "in 2 weeks" — for activity feeds and due dates. */
export function relativeTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (Math.abs(diffDays) < 1) return 'today';
  if (diffDays === -1) return 'yesterday';
  if (diffDays === 1) return 'tomorrow';

  const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });

  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  if (Math.abs(diffDays) < 365) return rtf.format(Math.round(diffDays / 30), 'month');
  return rtf.format(Math.round(diffDays / 365), 'year');
}

/** The current month as a "YYYY-MM" period key, read in IST. */
export function currentPeriodKey(): string {
  const ist = new Date(Date.now() + 330 * 60_000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2026-07" → "Jul 2026". */
export function periodKeyLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key ?? '');
  if (!match) return key ?? '—';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(match[2]) - 1] ?? '?'} ${match[1]}`;
}

/** The last `count` period keys, newest first — for a month picker. */
export function recentPeriodKeys(count = 12): string[] {
  const ist = new Date(Date.now() + 330 * 60_000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** Turn an ENUM_VALUE into a label: "BANK_TRANSFER" → "Bank transfer". */
export function humanize(value?: string | null): string {
  if (!value) return '—';
  const lower = value.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
