import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CreditCard,
  Hourglass,
  IndianRupee,
  PieChart,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill } from '@/components/finance/Controls';
import { CardGridSkeleton, InfoNote } from '@/components/finance/States';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { Button } from '@/components/ui/Button';
import {
  getPlatformBusiness,
  type BusinessUser,
  type PlatformBusiness,
  type ShareSplit,
} from '@/lib/ecosystemApi';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, humanize, inr } from '@/lib/format';
import { cn, getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  A SUB-PRODUCT'S BUSINESS — users, plans, trials, revenue, admin shares
 * ============================================================================
 *
 * Read server-to-server from the platform's own backend, so it needs no
 * account login. Shown above everything else on the sub-product page, because
 * it is what the founders open the page for.
 * ============================================================================
 */

const PLAN_ORDER = ['premium', 'standard', 'free_trial', 'expired', 'legacy'];
const PLAN_COLOR: Record<string, string> = {
  premium: '#a78bfa',
  standard: '#3f7bfd',
  free_trial: '#22c08a',
  expired: '#94a3b8',
  legacy: '#f0b429',
};
const PLAN_TONE: Record<string, 'violet' | 'blue' | 'green' | 'gray' | 'amber'> = {
  premium: 'violet',
  standard: 'blue',
  free_trial: 'green',
  expired: 'gray',
  legacy: 'amber',
};

function planLabel(plan: string): string {
  return plan === 'free_trial' ? 'Free trial' : humanize(plan);
}

function monthShort(key: string): string {
  const [year, month] = key.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
    month: 'short',
    timeZone: 'UTC',
  }) + ` ${String(year).slice(2)}`;
}

/** Days until a date, negative once passed. */
function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-card p-5', className)}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** The two-tier split of one amount of revenue, as a statement. */
function ShareStatement({ split }: { split: ShareSplit }) {
  const row = (name: string, percent: number, amount: number, tone: string, indent = false) => (
    <li key={`${name}-${percent}`} className={cn('flex items-center gap-3 py-2', indent && 'pl-5')}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', tone)} />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{name}</span>
      <span className="text-xs tabular-nums text-slate-500">{percent}%</span>
      <span className="w-24 text-right text-sm font-semibold tabular-nums text-white">{inr(amount)}</span>
    </li>
  );

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-500">Revenue</span>
        <span className="text-lg font-bold text-white">{inr(split.revenue)}</span>
      </div>
      <ul className="divide-y divide-white/5">
        <li className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Platform agreement (paid first)
        </li>
        {split.platformLines.map((line) => row(line.name, line.percent, line.amount, 'bg-brand-400'))}
        {row('Esscentra (remainder)', split.toEsscentra.percent, split.toEsscentra.amount, 'bg-amber-400')}
        <li className="pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Esscentra’s share, split by the parent agreement
        </li>
        {split.parentLines.map((line) => row(line.name, line.percent, line.amount, 'bg-violet-400', true))}
      </ul>
    </div>
  );
}

export function BusinessSection({ platformId, platformName, isSuperAdmin }: { platformId: string; platformName: string; isSuperAdmin: boolean }) {
  const [data, setData] = useState<PlatformBusiness | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareView, setShareView] = useState<'lifetime' | 'thisMonth'>('lifetime');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getPlatformBusiness(platformId));
    } catch (thrown) {
      setError({
        status: thrown instanceof ApiError ? thrown.status : 0,
        message: getErrorMessage(thrown),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.recentUsers ?? []).filter(
      (user) =>
        (!planFilter || user.plan === planFilter) &&
        (!term || user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)),
    );
  }, [data, search, planFilter]);

  // A sub-product without a business feed simply has no section.
  if (error?.status === 404) return null;

  if (loading && !data) {
    return (
      <section className="space-y-4">
        <CardGridSkeleton />
        <div className="glass-card h-56 animate-pulse" />
      </section>
    );
  }

  if (error || !data) {
    return (
      <InfoNote tone={error?.status === 409 ? 'info' : 'warning'}>
        {error?.message ?? 'The business summary is unavailable.'}{' '}
        {isSuperAdmin && error?.status === 409 && (
          <>Generate one long random key and set it as <code>HUB_API_KEY</code> on {platformName}’s backend and as <code>PREP_HUB_API_KEY</code> on this hub’s backend.</>
        )}
      </InfoNote>
    );
  }

  const planSlices = PLAN_ORDER.filter((plan) => data.users.byPlan[plan]).map((plan) => ({
    label: planLabel(plan),
    value: data.users.byPlan[plan] ?? 0,
    color: PLAN_COLOR[plan],
  }));
  const split = data.shares[shareView];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Business</h2>
          <p className="text-xs text-slate-500">
            From {platformName} directly · updated {formatDateTime(data.generatedAt)}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void load()} loading={loading}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={Users}
          label="Users"
          value={data.users.total.toLocaleString('en-IN')}
          hint={`${data.users.signupsThisMonth} joined this month · ${data.users.verified} verified`}
          tone="brand"
        />
        <FinanceCard
          icon={CreditCard}
          label="Paying subscribers"
          value={data.subscriptions.active.toLocaleString('en-IN')}
          hint={`${inr(data.subscriptions.monthlyRecurringRevenue)} monthly recurring`}
          tone="violet"
        />
        <FinanceCard
          icon={Hourglass}
          label="Free trials running"
          value={data.trials.active.toLocaleString('en-IN')}
          hint={`${data.trials.endingIn3Days} end within 3 days`}
          tone="green"
        />
        <FinanceCard
          icon={IndianRupee}
          label="Revenue received"
          value={data.revenue.total}
          format={inr}
          hint={`${inr(data.revenue.thisMonth)} this month · ${data.revenue.payments} payments`}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Plan mix" subtitle="Every account by its current plan">
          {planSlices.length ? (
            <DonutChart slices={planSlices} size={120} centerLabel="users" formatValue={(v) => String(Math.round(v))} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No users yet.</p>
          )}
        </Card>

        <Card title="Free trials" subtitle="Seven days for every new account">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-400">Running now</dt><dd className="font-semibold text-white">{data.trials.active}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Ending within 3 days</dt><dd className="font-semibold text-amber-300">{data.trials.endingIn3Days}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Ended without paying</dt><dd className="font-semibold text-white">{data.trials.lapsed}</dd></div>
            <div className="flex justify-between border-t border-white/5 pt-3"><dt className="text-slate-400">Trial-to-paid conversion</dt><dd className="font-semibold text-emerald-300">{data.trials.conversionPercent === null ? '—' : `${data.trials.conversionPercent}%`}</dd></div>
          </dl>
        </Card>

        <Card title="Subscriptions" subtitle="Active paid plans">
          <dl className="space-y-3 text-sm">
            {['premium', 'standard'].map((tier) => (
              <div key={tier} className="flex justify-between"><dt className="text-slate-400">{humanize(tier)}</dt><dd className="font-semibold text-white">{data.subscriptions.activeByTier[tier] ?? 0}</dd></div>
            ))}
            {['monthly', 'quarterly', 'yearly'].map((cycle) => (
              <div key={cycle} className="flex justify-between"><dt className="text-slate-400">Billed {cycle}</dt><dd className="font-semibold text-white">{data.subscriptions.activeByCycle[cycle] ?? 0}</dd></div>
            ))}
            {data.subscriptions.activeTestMode > 0 && (
              <p className="border-t border-white/5 pt-3 text-xs text-slate-500">
                {data.subscriptions.activeTestMode} test-mode activations are not counted.
              </p>
            )}
          </dl>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartFrame title="Revenue by month" subtitle="Payments received, last 12 months" isEmpty={!data.revenue.byMonth.some((m) => m.amount > 0)} emptyMessage="No payments received yet.">
          <BarChart
            categories={data.revenue.byMonth.map((m) => monthShort(m.month))}
            series={[{ key: 'revenue', label: 'Revenue', color: '#f0b429', values: data.revenue.byMonth.map((m) => m.amount) }]}
            formatValue={inr}
          />
        </ChartFrame>
        <ChartFrame title="New users by month" subtitle="Sign-ups, last 12 months" isEmpty={!data.users.signupsByMonth.some((m) => m.count > 0)}>
          <BarChart
            categories={data.users.signupsByMonth.map((m) => monthShort(m.month))}
            series={[{ key: 'signups', label: 'Sign-ups', color: '#3f7bfd', values: data.users.signupsByMonth.map((m) => m.count) }]}
            formatValue={(v) => String(Math.round(v))}
          />
        </ChartFrame>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">Admin shares</h3>
              <p className="text-xs text-slate-500">{platformName}’s revenue, split by its agreement and then the parent split</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs">
            {(['lifetime', 'thisMonth'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setShareView(view)}
                className={cn('rounded-md px-3 py-1.5 font-medium transition', shareView === view ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white')}
              >
                {view === 'lifetime' ? 'All time' : 'This month'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3"><ShareStatement split={split} /></div>
          <div className="lg:col-span-2">
            {split.revenue > 0 ? (
              <DonutChart
                slices={[
                  ...split.platformLines.map((l) => ({ label: l.name, value: l.amount })),
                  ...split.parentLines.map((l) => ({ label: `${l.name} (via Esscentra)`, value: l.amount })),
                ]}
                size={150}
                centerLabel="shared"
                formatValue={inr}
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No revenue to share for this period yet.</p>
            )}
          </div>
        </div>
      </div>

      {isSuperAdmin && data.recentUsers && (
        <div className="glass-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/25">
                <PieChart className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Users</h3>
                <p className="text-xs text-slate-500">
                  {users.length} shown{data.users.total > (data.recentUsersLimit ?? 0) ? ` · newest ${data.recentUsersLimit} of ${data.users.total}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or email"
                  className="h-9 w-56 rounded-lg border border-white/10 bg-white/[0.05] pl-8 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-brand-400/50"
                />
              </label>
              <select
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
                className="select-field h-9 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-xs text-slate-200 outline-none"
                aria-label="Filter by plan"
              >
                <option value="">All plans</option>
                {PLAN_ORDER.map((plan) => (
                  <option key={plan} value={plan}>{planLabel(plan)}</option>
                ))}
              </select>
            </div>
          </div>

          <FinanceTable<BusinessUser>
            rows={users}
            rowKey={(user) => user.id}
            emptyTitle="No users match"
            maxHeight={560}
            columns={[
              {
                key: 'user',
                header: 'User',
                render: (user) => (
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate font-medium text-white">
                        {user.name}
                        {user.emailVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-label="Email verified" />}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'plan',
                header: 'Plan',
                render: (user) => <Pill tone={PLAN_TONE[user.plan] ?? 'gray'}>{planLabel(user.plan)}</Pill>,
              },
              {
                key: 'status',
                header: 'Trial / subscription',
                render: (user) => {
                  if (user.subscription && !user.subscription.testMode && user.subscription.status === 'active') {
                    return (
                      <span className="text-xs text-slate-300">
                        {humanize(user.subscription.tier)} · {user.subscription.cycle}
                        <span className="block text-slate-500">Renews {formatDate(user.subscription.renewsAt)}</span>
                      </span>
                    );
                  }
                  if (user.plan === 'free_trial') {
                    const left = daysUntil(user.trialEndsAt);
                    return (
                      <span className={cn('text-xs', left !== null && left <= 0 ? 'text-slate-500' : left !== null && left <= 3 ? 'text-amber-300' : 'text-emerald-300')}>
                        {left === null ? 'Trial' : left > 0 ? `${left} day${left === 1 ? '' : 's'} of trial left` : 'Trial ended'}
                        <span className="block text-slate-500">Ends {formatDate(user.trialEndsAt)}</span>
                      </span>
                    );
                  }
                  return <span className="text-xs text-slate-500">{user.subscription?.testMode ? 'Test-mode plan' : '—'}</span>;
                },
              },
              {
                key: 'referrals',
                header: 'Referrals',
                numeric: true,
                hideOnMobile: true,
                render: (user) => user.referrals ?? 0,
              },
              {
                key: 'joined',
                header: 'Joined',
                hideOnMobile: true,
                render: (user) => <span className="whitespace-nowrap text-slate-400">{formatDate(user.joinedAt)}</span>,
              },
            ]}
          />
        </div>
      )}
    </section>
  );
}
