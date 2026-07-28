import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building,
  CalendarClock,
  Download,
  FileText,
  FolderKanban,
  HandCoins,
  Image as ImageIcon,
  Receipt,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, type DashboardStats } from '@/lib/dashboardApi';
import {
  listMyInvestments,
  downloadInvoice,
  type MyInvestments,
} from '@/lib/investmentApi';
import {
  listMyCommitments,
  downloadExpenseAttachment,
  type Commitment,
} from '@/lib/commitmentApi';
import { getErrorMessage } from '@/lib/utils';

/* ----------------------------- formatting ----------------------------- */

const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const inrFull = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const fmt = (n: number) => inrCompact.format(n);
const fmtFull = (n: number) => inrFull.format(n);

function fmtDueDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const today = new Date();
  return Math.ceil(
    (new Date(iso).getTime() - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000,
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Round a max value up to a "clean" axis ceiling (1/2/2.5/5 × 10^k). */
function niceCeil(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const unit = max / pow;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return step * pow;
}

/* ------------------------------- palette ------------------------------- */
// Ordinal blue ramp (light→dark) for pipeline stages, chosen for the dark
// surface; single hue = magnitude, per the data-viz color rules.
const STAGE_RAMP: Record<string, string> = {
  NEW: '#86b6ef',
  QUALIFIED: '#5598e7',
  PROPOSAL: '#3987e5',
  NEGOTIATION: '#256abf',
};
const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
};
// Categorical slots (dark-surface steps) for project delivery states.
const PROJECT_COLORS: Record<string, string> = {
  PLANNED: '#3987e5',
  IN_PROGRESS: '#199e70',
  ON_HOLD: '#c98500',
  COMPLETED: '#9085e9',
  CANCELLED: '#e66767',
};
const PROJECT_LABEL: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const SERIES_BLUE = '#3987e5';

/* -------------------------------- page -------------------------------- */

export default function InvestorDashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [myInv, setMyInv] = useState<MyInvestments | null>(null);
  const [myCommitments, setMyCommitments] = useState<Commitment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboardStats()
      .then((s) => active && setStats(s))
      .catch((e) => active && setError(getErrorMessage(e)));
    // Personal investment records load independently — if they fail, the
    // business KPIs still render.
    listMyInvestments()
      .then((m) => active && setMyInv(m))
      .catch(() => active && setMyInv({ items: [], totalInvested: 0, count: 0 }));
    listMyCommitments()
      .then((c) => active && setMyCommitments(c))
      .catch(() => active && setMyCommitments([]));
    return () => {
      active = false;
    };
  }, []);

  const monthly = stats?.monthly ?? [];
  const revenueMax = useMemo(
    () => niceCeil(Math.max(...monthly.map((m) => m.wonAmount), 0)),
    [monthly],
  );
  const revenueTicks = [1, 0.75, 0.5, 0.25, 0]; // fractions of revenueMax, top→bottom
  const bestMonthIdx = useMemo(() => {
    if (!monthly.length) return -1;
    let idx = 0;
    monthly.forEach((m, i) => {
      if (m.wonAmount > monthly[idx].wonAmount) idx = i;
    });
    return monthly[idx].wonAmount > 0 ? idx : -1;
  }, [monthly]);

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Investor overview" title="Business performance" />
        <EmptyState title="Couldn't load metrics" description={error} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <PageHeader eyebrow="Investor overview" title="Business performance" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      </div>
    );
  }

  const t = stats.totals;
  const openStages = stats.opportunitiesByStage.filter((s) => s.stage in STAGE_RAMP);
  const stageMax = Math.max(...openStages.map((s) => s.amount), 0);
  const leadDelta = t.leadsThisMonth - t.leadsPrevMonth;
  const projectTotal = stats.projectsByStatus.reduce((sum, p) => sum + p.count, 0);
  const hasRevenue = monthly.some((m) => m.wonAmount > 0);
  const leadSpark = buildSparkline(monthly.map((m) => m.newLeads));

  return (
    <div>
      <PageHeader
        eyebrow="Investor overview"
        title={`Welcome, ${firstName}`}
        subtitle="Aggregated business performance — pipeline, revenue and delivery. Read-only view."
      />

      {/* Hero figure: the one number this view leads with */}
      <div className="glass-card mb-4 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Open pipeline value
        </p>
        <p
          className="mt-2 font-display text-5xl font-bold leading-none tracking-tight text-white"
          title={fmtFull(t.pipelineValue)}
        >
          {fmt(t.pipelineValue)}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          across {t.pipelineCount} open {t.pipelineCount === 1 ? 'deal' : 'deals'}
        </p>
      </div>

      {/* Your commitments — pledge progress + how the funds were used */}
      {myCommitments && myCommitments.length > 0 && (
        <div className="mb-4 space-y-4">
          {myCommitments.map((c) => {
            const pct =
              c.committedAmount > 0
                ? Math.min(100, Math.round((c.receivedTotal / c.committedAmount) * 100))
                : 0;
            return (
              <div key={c.id} className="glass-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-700/10 text-emerald-200 ring-1 ring-emerald-400/30">
                      <HandCoins className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{c.title}</h3>
                      <p className="text-xs text-slate-500">
                        Started {c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        {' · '}
                        {c.status === 'ACTIVE' ? 'Active' : c.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    <span className="font-semibold text-white tabular-nums">{pct}%</span> funded
                  </p>
                </div>

                {/* Committed / received / remaining / spent / balance */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: 'Committed', value: fmt(c.committedAmount) },
                    { label: 'Paid so far', value: fmt(c.receivedTotal) },
                    { label: 'Remaining', value: fmt(c.remainingToReceive) },
                    { label: 'Spent', value: fmt(c.spentTotal) },
                    { label: 'Balance', value: fmt(c.balanceAvailable) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-sm font-bold text-white tabular-nums">{s.value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {c.status === 'ACTIVE' &&
                  c.dueDay &&
                  c.nextDueDate &&
                  c.remainingToReceive > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.07] px-4 py-3">
                      <CalendarClock className="h-4 w-4 shrink-0 text-amber-300" />
                      <p className="text-sm text-amber-100">
                        Next payment due{' '}
                        <span className="font-semibold">{fmtDueDate(c.nextDueDate)}</span>
                        <span className="text-amber-200/70">
                          {' '}
                          ({daysUntil(c.nextDueDate) <= 0
                            ? 'due now'
                            : `in ${daysUntil(c.nextDueDate)} ${daysUntil(c.nextDueDate) === 1 ? 'day' : 'days'}`}
                          )
                        </span>
                      </p>
                      <p className="ml-auto text-xs text-amber-200/80">
                        {fmtFull(c.remainingToReceive)} pending · every {c.dueDay} of the month
                      </p>
                    </div>
                  )}

                {/* Funding progress meter */}
                <div className="mt-4 h-2.5 w-full rounded-full bg-brand-500/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* How the funds were used */}
                {c.expenses && c.expenses.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      How your funds were used
                    </p>
                    <ul className="space-y-1.5">
                      {c.expenses.map((x) => (
                        <li key={x.id} className="flex items-center gap-2.5 text-sm">
                          <Receipt className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                          <span className="min-w-0 flex-1 truncate text-slate-300">
                            {x.category || x.description || 'Expense'}
                            {x.category && x.description ? ` — ${x.description}` : ''}
                            <span className="ml-1.5 text-xs text-slate-500">
                              {x.spentAt
                                ? new Date(x.spentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                : ''}
                            </span>
                          </span>
                          {x.attachments.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5">
                              {x.attachments.map((a, i) => (
                                <span key={i} className="flex items-center">
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`View ${a.name}`}
                                    className="grid h-7 w-7 place-items-center rounded-lg text-brand-300 hover:bg-brand-500/10"
                                  >
                                    {a.isPdf ? (
                                      <FileText className="h-3.5 w-3.5" />
                                    ) : (
                                      <ImageIcon className="h-3.5 w-3.5" />
                                    )}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void downloadExpenseAttachment(x.id, i, a.name).catch(() => {})
                                    }
                                    title={`Download ${a.name}`}
                                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </span>
                          )}
                          <span className="tabular-nums text-slate-400">{fmtFull(x.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Your investments — personal records + invoice PDFs */}
      <div className="glass-card mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400/30 to-brand-700/15 text-brand-200 ring-1 ring-brand-400/30">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-white">Payments received</h3>
              <p className="text-xs text-slate-500">
                {myInv
                  ? `${myInv.count} ${myInv.count === 1 ? 'payment' : 'payments'} on record — money actually paid in`
                  : 'Loading…'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="font-display text-2xl font-bold leading-none text-white tabular-nums"
              title={myInv ? fmtFull(myInv.totalInvested) : undefined}
            >
              {myInv ? fmt(myInv.totalInvested) : '—'}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Total paid in
            </p>
          </div>
        </div>

        {myInv && myInv.items.length > 0 && (
          <ul className="mt-4 divide-y divide-white/5 border-t border-white/10">
            {myInv.items.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white tabular-nums">{fmtFull(inv.amount)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {inv.investedAt
                      ? new Date(inv.investedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                    {inv.notes ? ` · ${inv.notes}` : ''}
                  </p>
                </div>
                {inv.invoiceUrl ? (
                  <span className="flex items-center gap-2">
                    <a
                      href={inv.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <FileText className="h-3.5 w-3.5" /> View invoice
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        void downloadInvoice(inv.id, inv.invoiceName || 'invoice.pdf').catch(() => {})
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Invoice pending</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {myInv && myInv.items.length === 0 && (
          <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">
            No investment records yet — once the Esscentra team records your contribution, it
            will appear here with its invoice.
          </p>
        )}
      </div>

      {/* KPI tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          tone="green"
          label="Won revenue"
          value={fmt(t.wonRevenue)}
          hint={`${t.wonCount} ${t.wonCount === 1 ? 'deal' : 'deals'} closed won`}
        />
        <StatCard
          icon={Target}
          tone="brand"
          label="Win rate"
          value={t.winRate === null ? '—' : `${Math.round(t.winRate * 100)}%`}
          hint={
            t.winRate === null
              ? 'No closed deals yet'
              : `of ${t.wonCount + t.lostCount} closed deals`
          }
        />
        <StatCard
          icon={Building}
          tone="sky"
          label="Active clients"
          value={t.activeAccounts}
          hint="Accounts currently active"
        />
        <StatCard
          icon={FolderKanban}
          tone="violet"
          label="Projects in delivery"
          value={t.activeProjects}
          hint={`${t.completedProjects} completed to date`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Won revenue by month — single-series column chart */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white">Won revenue by month</h3>
          <p className="mt-0.5 text-xs text-slate-500">Last 12 months</p>

          <div className="mt-4">
            <div className="relative h-44">
              {/* hairline gridlines + clean ticks */}
              {revenueTicks.map((f) => (
                <div
                  key={f}
                  className="absolute inset-x-0 flex items-center gap-2"
                  style={{ top: `${(1 - f) * 100}%` }}
                >
                  <span className="w-10 shrink-0 -translate-y-1/2 text-right text-[10px] tabular-nums text-slate-500">
                    {fmt(revenueMax * f)}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              ))}
              {/* columns */}
              <div className="absolute inset-y-0 left-12 right-0 flex items-end gap-[3px]">
                {monthly.map((m, i) => {
                  const h = revenueMax > 0 ? (m.wonAmount / revenueMax) * 100 : 0;
                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      className="group relative flex h-full flex-1 items-end justify-center"
                      title={`${MONTHS[m.month - 1]} ${m.year}: ${fmtFull(m.wonAmount)} won (${m.wonCount} ${m.wonCount === 1 ? 'deal' : 'deals'})`}
                    >
                      {/* selective direct label: best month only */}
                      {i === bestMonthIdx && (
                        <span
                          className="absolute -translate-y-full pb-1 text-[10px] font-semibold tabular-nums text-slate-300"
                          style={{ bottom: `${h}%` }}
                        >
                          {fmt(m.wonAmount)}
                        </span>
                      )}
                      <div
                        className="w-full max-w-[22px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                        style={{
                          height: `${h}%`,
                          minHeight: m.wonAmount > 0 ? 3 : 0,
                          backgroundColor: SERIES_BLUE,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* month labels */}
            <div className="ml-12 mt-1.5 flex gap-[3px]">
              {monthly.map((m) => (
                <span
                  key={`${m.year}-${m.month}-l`}
                  className="flex-1 text-center text-[9px] text-slate-500"
                >
                  {MONTHS[m.month - 1][0]}
                </span>
              ))}
            </div>
            {!hasRevenue && (
              <p className="mt-3 text-center text-xs text-slate-500">
                No deals closed won yet — revenue will appear here.
              </p>
            )}
          </div>
        </div>

        {/* Open pipeline by stage — ordinal single-hue bars */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white">Open pipeline by stage</h3>
          <p className="mt-0.5 text-xs text-slate-500">Value of open deals at each stage</p>

          <div className="mt-5 space-y-4">
            {openStages.map((s) => {
              const w = stageMax > 0 ? (s.amount / stageMax) * 100 : 0;
              return (
                <div key={s.stage} title={`${STAGE_LABEL[s.stage]}: ${fmtFull(s.amount)} · ${s.count} ${s.count === 1 ? 'deal' : 'deals'}`}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-medium text-slate-300">{STAGE_LABEL[s.stage]}</span>
                    <span className="tabular-nums text-slate-400">
                      {fmt(s.amount)}
                      <span className="ml-1.5 text-slate-500">· {s.count}</span>
                    </span>
                  </div>
                  <div className="h-3.5 w-full rounded-r-[4px] bg-white/[0.04]">
                    <div
                      className="h-full rounded-r-[4px]"
                      style={{
                        width: `${w}%`,
                        minWidth: s.amount > 0 ? 4 : 0,
                        backgroundColor: STAGE_RAMP[s.stage],
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {stageMax === 0 && (
              <p className="text-center text-xs text-slate-500">No open deals right now.</p>
            )}
          </div>
        </div>

        {/* Projects by status — stacked bar + legend */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white">Projects by status</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {projectTotal} {projectTotal === 1 ? 'project' : 'projects'} total
          </p>

          {projectTotal > 0 ? (
            <>
              <div className="mt-5 flex h-3.5 w-full gap-[2px] overflow-hidden rounded-[4px]">
                {stats.projectsByStatus
                  .filter((p) => p.count > 0)
                  .map((p) => (
                    <div
                      key={p.status}
                      title={`${PROJECT_LABEL[p.status]}: ${p.count}`}
                      style={{
                        width: `${(p.count / projectTotal) * 100}%`,
                        backgroundColor: PROJECT_COLORS[p.status],
                      }}
                    />
                  ))}
              </div>
              <ul className="mt-4 space-y-2">
                {stats.projectsByStatus.map((p) => (
                  <li key={p.status} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PROJECT_COLORS[p.status] }}
                      aria-hidden
                    />
                    <span className="flex-1 text-slate-300">{PROJECT_LABEL[p.status]}</span>
                    <span className="tabular-nums text-slate-400">{p.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-5 text-center text-xs text-slate-500">No projects yet.</p>
          )}
        </div>

        {/* Lead flow — growth signal */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white">Lead flow</h3>
          <p className="mt-0.5 text-xs text-slate-500">New leads per month, last 12 months</p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-bold leading-none text-white tabular-nums">
                {t.leadsThisMonth}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">this month</p>
              <p
                className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                  leadDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                <TrendingUp className={`h-3.5 w-3.5 ${leadDelta < 0 ? 'rotate-180' : ''}`} />
                {leadDelta >= 0 ? '+' : ''}
                {leadDelta} vs last month
              </p>
            </div>
            {/* 12-point sparkline, single series */}
            <svg viewBox="0 0 240 64" className="h-16 w-full max-w-[240px]" aria-hidden>
              <polyline
                points={leadSpark.points}
                fill="none"
                stroke={SERIES_BLUE}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* end marker with surface ring so it stays legible on the line */}
              <circle
                cx={leadSpark.endX}
                cy={leadSpark.endY}
                r="4.5"
                fill={SERIES_BLUE}
                stroke="#070c1a"
                strokeWidth="2"
              />
            </svg>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <BadgeCheck className="h-3.5 w-3.5" />
            {t.totalLeads} leads captured all-time
          </p>
        </div>
      </div>
    </div>
  );
}

/** Map 12 monthly values onto a 240×64 sparkline (4px padding all round). */
function buildSparkline(values: number[]) {
  const W = 240;
  const H = 64;
  const PAD = 6;
  const max = Math.max(...values, 1);
  const n = Math.max(values.length, 2);
  const pts = values.map((v, i) => {
    const x = PAD + (i * (W - PAD * 2)) / (n - 1);
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1] ?? [W - PAD, H - PAD];
  return {
    points: pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
    endX: last[0].toFixed(1),
    endY: last[1].toFixed(1),
  };
}
