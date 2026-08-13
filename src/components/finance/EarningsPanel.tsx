import { useEffect, useState } from 'react';
import { Boxes, Coins, Landmark, TrendingUp, Wallet } from 'lucide-react';
import { getMyEarnings, type MyEarnings } from '@/lib/ecosystemApi';
import { getErrorMessage } from '@/lib/utils';
import { inr } from '@/lib/format';

/**
 * ============================================================================
 *  MY EARNINGS — one person's cut of the two-tier waterfall
 * ============================================================================
 *
 * Shown on a founder's own profile and on the investor dashboard. It reads the
 * `/ecosystem/earnings/me` endpoint, which takes the account id from the
 * session — so this component cannot be pointed at anybody else's numbers, and
 * there is no prop to accidentally pass the wrong id through.
 *
 * Two tiers, kept visually separate because they are earned differently:
 *   Parent   — a slice of the Esscentra pool, per the standing agreement.
 *   Platform — founder bonuses on the child platforms this person runs.
 *
 * For an investor, the parent slice is their entitlement to the investors
 * pool, scaled by how much of their commitment has actually been funded. Cash
 * already distributed is shown separately and never added in — it is the same
 * money arriving, not more of it.
 * ============================================================================
 */

const pct = (n: number) =>
  `${Number.isInteger(n) ? n : Number(n.toFixed(2))}%`;

export function EarningsPanel({ className = '' }: { className?: string }) {
  const [data, setData] = useState<MyEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyEarnings()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((thrown) => {
        if (alive) setError(getErrorMessage(thrown));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section className={`glass-card p-6 ${className}`}>
        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-4 h-9 w-44 animate-pulse rounded bg-white/10" />
      </section>
    );
  }

  // A person with no share lines anywhere is not an error — they simply have
  // no stake in the waterfall, and an empty panel says that more clearly than
  // a row of zeroes would.
  if (error || !data) return null;
  const hasStake =
    data.totalEarned > 0 ||
    data.parent.directLines.length > 0 ||
    data.platforms.length > 0 ||
    Boolean(data.parent.investorPool);
  if (!hasStake) return null;

  const { parent, platforms } = data;

  return (
    <section className={`glass-card p-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            My earnings
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">
            {inr(data.totalEarned)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {inr(parent.total)} from Esscentra
            {platforms.length > 0 && <> · {inr(data.platformTotal)} from platforms</>}
          </p>
        </div>

        {data.distributions && data.distributions.totalPaid > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">
              Already paid out
            </p>
            <p className="mt-0.5 text-lg font-bold text-emerald-300">
              {inr(data.distributions.totalPaid)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-5">
        {/* --------------------------- parent tier --------------------------- */}
        {(parent.directLines.length > 0 || parent.investorPool) && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Landmark className="h-3.5 w-3.5" /> From Esscentra (parent)
            </p>

            <div className="mt-3 space-y-2">
              {parent.directLines.map((line, i) => (
                <Row
                  key={`${line.name}-${i}`}
                  label={line.name}
                  meta={pct(line.percent)}
                  amount={line.amount}
                />
              ))}

              {parent.investorPool && (
                <>
                  <Row
                    label="Investors pool"
                    meta={`${pct(parent.investorPool.poolPercent)} of the pool`}
                    amount={parent.investorPool.poolAmount}
                    muted
                  />
                  <Row
                    label="My entitlement"
                    meta={`${pct(parent.investorPool.ownershipPercent)} of ${pct(
                      parent.investorPool.totalAgreedPercent,
                    )} agreed · ${pct(parent.investorPool.entitlementRatio)} of the pool`}
                    amount={parent.investorPool.amount}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* -------------------------- platform tier -------------------------- */}
        {platforms.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Boxes className="h-3.5 w-3.5" /> From child platforms
            </p>

            <div className="mt-3 space-y-3">
              {platforms.map((platform) => (
                <div key={platform.platformId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-100">
                      {platform.name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-white">
                      {inr(platform.total)}
                    </p>
                  </div>
                  {platform.lines.map((line, i) => (
                    <p
                      key={`${line.name}-${i}`}
                      className="mt-0.5 truncate text-xs text-slate-500"
                    >
                      {line.name} · {pct(line.percent)} of {inr(platform.revenueTotal)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
        <span>
          Earned to date, recalculated from live revenue every time this page
          loads. Amounts shown are entitlements under the standing agreement,
          not a statement of cash paid.
        </span>
      </p>
    </section>
  );
}

/* --------------------------------- bits ----------------------------------- */

function Row({
  label,
  meta,
  amount,
  muted = false,
}: {
  label: string;
  meta?: string;
  amount: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p
          className={`truncate text-sm ${
            muted ? 'text-slate-400' : 'font-medium text-slate-100'
          }`}
        >
          {label}
        </p>
        {meta && <p className="truncate text-xs text-slate-500">{meta}</p>}
      </div>
      <p
        className={`shrink-0 text-sm font-semibold ${
          muted ? 'text-slate-400' : 'text-white'
        }`}
      >
        {inr(amount)}
      </p>
    </div>
  );
}

/** Compact single-figure variant for dashboards that only want the headline. */
export function EarningsCard() {
  const [data, setData] = useState<MyEarnings | null>(null);

  useEffect(() => {
    let alive = true;
    getMyEarnings()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!data || data.totalEarned <= 0) return null;

  return (
    <div className="glass-card flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-700/10 text-emerald-300 ring-1 ring-emerald-500/30">
        <Wallet className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          My earnings
        </p>
        <p className="truncate text-xl font-bold text-white">
          {inr(data.totalEarned)}
        </p>
        <p className="truncate text-xs text-slate-500">
          <Coins className="mr-1 inline h-3 w-3" />
          {inr(data.parent.total)} parent · {inr(data.platformTotal)} platforms
        </p>
      </div>
    </div>
  );
}
