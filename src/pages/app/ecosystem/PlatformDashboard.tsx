import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  IndianRupee,
  Layers,
  ListChecks,
  Mic,
  PlugZap,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Unplug,
  Users,
} from 'lucide-react';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { BarChart } from '@/components/charts/BarChart';
import { CircularProgress } from '@/components/charts/CircularProgress';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { categoricalColor } from '@/components/charts/chartTheme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { PlatformLogo } from '@/components/PlatformLogo';
import { BusinessSection } from './BusinessSection';
import { useAuth } from '@/context/AuthContext';
import {
  connectPlatformLive,
  disconnectPlatformLive,
  ECOSYSTEM_CHANGED_EVENT,
  getEcosystemOverview,
  getEcosystemPlatform,
  getPlatformLiveOverview,
  type EcosystemPlatformRow,
  type PlatformDetail,
  type PlatformStatus,
  type PrepLiveData,
  type PrepLiveOverview,
  type PrepTask,
} from '@/lib/ecosystemApi';
import { formatDate, formatDateTime, humanize, inr } from '@/lib/format';
import { cn, getErrorMessage, isSuperAdminRole } from '@/lib/utils';

/**
 * ============================================================================
 *  ONE SUB-PRODUCT — its ledger, its agreement, and its live product data
 * ============================================================================
 *
 * The money side (users, revenue, the tier-1 split) comes from the hub's own
 * records and is shown for every platform. The product side comes from the
 * platform's own API, read through the hub's server as a connected account,
 * and is shown to super admins once a connection exists.
 * ============================================================================
 */

const DEFAULT_PREP_API = 'https://esscentra-prep-be.onrender.com/api';

const STATUS_TONE: Record<PlatformStatus, 'green' | 'blue' | 'amber' | 'gray'> = {
  ACTIVE: 'green',
  BETA: 'blue',
  PAUSED: 'amber',
  SUNSET: 'gray',
};

type Tone = "green" | "blue" | "amber" | "red" | "violet" | "gray";

/** One colour language for every status Prep reports, whatever the panel. */
const TONE_WORDS: Array<[Tone, string[]]> = [
  ["green", ["strong", "ready", "ahead", "on track", "done", "completed", "submitted", "offer", "active", "mastered"]],
  ["amber", ["developing", "behind", "in_progress", "in progress", "applied", "oa", "trialing", "trial"]],
  ["violet", ["interview"]],
  ["red", ["weak", "stalled", "overdue", "rejected", "expired", "cancelled", "failed"]],
];

function toneFor(status?: string | null): Tone {
  const value = String(status ?? "").toLowerCase().trim();
  return TONE_WORDS.find(([, words]) => words.includes(value))?.[0] ?? "gray";
}

type Tab = 'overview' | 'roadmap' | 'progress' | 'practice' | 'jobs';

const TABS: Array<{ key: Tab; label: string; icon: typeof Layers }> = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'roadmap', label: 'Roadmap', icon: CalendarDays },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
  { key: 'practice', label: 'Practice', icon: Brain },
  { key: 'jobs', label: 'Job hunt', icon: Briefcase },
];

/** A 0–1 fraction or a 0–100 figure, read as a percentage either way. */
function asPercent(value?: number | null): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return value <= 1 && value > 0 ? value * 100 : value;
}

function ratio(done = 0, total = 0): number {
  return total > 0 ? (done / total) * 100 : 0;
}

function hours(minutes = 0): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} h`;
}

/* ------------------------------ building blocks ---------------------------- */

function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  error,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Layers;
  action?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/25">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {error ? <p className="text-xs text-amber-300">Couldn’t load this part: {error}</p> : children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

function ProgressBar({ value, color = '#3f7bfd' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function TaskList({ tasks, emptyText }: { tasks?: PrepTask[]; emptyText: string }) {
  if (!tasks?.length) return <Empty>{emptyText}</Empty>;
  return (
    <ul className="divide-y divide-white/5">
      {tasks.map((task) => (
        <li key={task._id} className="flex items-start gap-3 py-2.5">
          <CheckCircle2
            className={cn('mt-0.5 h-4 w-4 shrink-0', task.completed ? 'text-emerald-400' : 'text-slate-600')}
          />
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm', task.completed ? 'text-slate-500 line-through' : 'text-slate-200')}>
              {task.title || 'Untitled task'}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {[task.category, task.slot, task.date && formatDate(task.date)].filter(Boolean).join(' · ')}
            </p>
          </div>
          {task.isRevision && <Pill tone="violet">Revision</Pill>}
        </li>
      ))}
    </ul>
  );
}

/** A month of study days, shaded by how much of each day got done. */
function CalendarHeatmap({ month, days }: { month?: string; days?: Record<string, { total?: number; done?: number }> }) {
  if (!month) return <Empty>No calendar data.</Empty>;
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(year, monthIndex - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase text-slate-500">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const key = `${month}-${String(day).padStart(2, '0')}`;
          const entry = days?.[key];
          const share = entry?.total ? (entry.done ?? 0) / entry.total : 0;
          return (
            <span
              key={key}
              title={entry?.total ? `${formatDate(key)}: ${entry.done ?? 0} of ${entry.total} done` : formatDate(key)}
              className={cn(
                'grid aspect-square place-items-center rounded-md text-[11px] font-medium ring-1',
                !entry?.total
                  ? 'bg-white/[0.02] text-slate-600 ring-white/5'
                  : share >= 1
                    ? 'bg-emerald-500/70 text-white ring-emerald-400/40'
                    : share >= 0.5
                      ? 'bg-emerald-500/35 text-emerald-100 ring-emerald-400/25'
                      : share > 0
                        ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/15'
                        : 'bg-rose-500/10 text-rose-200 ring-rose-400/15',
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500/30" /> Planned, none done</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/35" /> Partly done</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /> All done</span>
      </p>
    </div>
  );
}

/* -------------------------------- live tabs -------------------------------- */

function OverviewTab({ data, errors }: { data: PrepLiveData; errors: PrepLiveOverview['errors'] }) {
  const overall = data.stats?.overall;
  const pace = data.pace;
  const report = data.weeklyReport?.report;
  const readiness = data.readiness;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={ListChecks}
          label="Tasks completed"
          value={`${overall?.done ?? 0} / ${overall?.total ?? 0}`}
          hint={`${Math.round(ratio(overall?.done, overall?.total))}% of the roadmap`}
          tone="brand"
        />
        <FinanceCard
          icon={Flame}
          label="Study streak"
          value={`${data.stats?.streak ?? 0} days`}
          hint="Consecutive days with work done"
          tone="amber"
        />
        <FinanceCard
          icon={Clock}
          label="Focus time (7 days)"
          value={hours(data.stats?.focus?.last7Minutes)}
          hint={`${hours(data.stats?.focus?.totalMinutes)} in total`}
          tone="violet"
        />
        <FinanceCard
          icon={Target}
          label="Pace"
          value={pace?.status ? humanize(pace.status) : '—'}
          hint={
            pace?.projectedFinish
              ? `Projected finish ${formatDate(pace.projectedFinish)}`
              : 'No projection yet'
          }
          tone={toneFor(pace?.status) === 'red' ? 'rose' : toneFor(pace?.status) === 'amber' ? 'amber' : 'green'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Interview readiness" subtitle={readiness?.status ? humanize(readiness.status) : undefined} icon={Gauge} error={errors.readiness}>
          <div className="flex flex-col items-center gap-4">
            <CircularProgress
              value={asPercent(readiness?.overall)}
              size={150}
              valueLabel={`${Math.round(asPercent(readiness?.overall))}%`}
              caption="overall"
            />
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              {[
                ['Revisions due', readiness?.pendingRevisions],
                ['Quizzes', readiness?.quizzesTaken],
                ['Interviews', readiness?.interviewsTaken],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-white/[0.03] px-2 py-2">
                  <p className="text-base font-bold text-white">{(value as number) ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="This week" subtitle={report?.weekStart ? `${formatDate(report.weekStart)} – ${formatDate(report.weekEnd)}` : undefined} icon={CalendarDays} error={errors.weeklyReport}>
          {report ? (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-400">Completed</span>
                  <span className="font-semibold text-white">
                    {report.doneThisWeek ?? 0} of {report.scheduledThisWeek ?? 0}
                  </span>
                </div>
                <ProgressBar value={asPercent(report.completionPct)} color="#22c08a" />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-500">Focus</dt><dd className="font-semibold text-white">{hours(report.focusMinutes)}</dd></div>
                <div><dt className="text-xs text-slate-500">Flashcards due</dt><dd className="font-semibold text-white">{report.flashcardsDue ?? 0}</dd></div>
                <div><dt className="text-xs text-slate-500">Job follow-ups</dt><dd className="font-semibold text-white">{report.followUps ?? 0}</dd></div>
                <div><dt className="text-xs text-slate-500">Needed per day</dt><dd className="font-semibold text-white">{pace?.neededPerDay ?? '—'}</dd></div>
              </dl>
            </div>
          ) : (
            <Empty>No weekly report yet.</Empty>
          )}
        </Panel>

        <Panel title="Account" subtitle={data.me?.user?.email} icon={Users} error={errors.me}>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Name</dt><dd className="truncate font-medium text-white">{data.me?.user?.name ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Subscription</dt><dd><Pill tone={data.billing?.active ? 'green' : 'amber'}>{humanize(data.billing?.tier ?? data.me?.user?.plan ?? 'unknown')}</Pill></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="text-white">{humanize(data.billing?.status ?? '—')}</dd></div>
            {data.billing?.daysLeft !== undefined && data.billing?.daysLeft !== null && (
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Days left</dt><dd className="text-white">{data.billing.daysLeft}</dd></div>
            )}
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Member since</dt><dd className="text-white">{formatDate(data.me?.user?.createdAt)}</dd></div>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Today’s tasks" subtitle={`${data.today?.tasks?.filter((t) => t.completed).length ?? 0} of ${data.today?.tasks?.length ?? 0} done`} icon={ListChecks} error={errors.today}>
          <TaskList tasks={data.today?.tasks} emptyText="Nothing scheduled for today." />
        </Panel>
        <Panel title="Overdue" subtitle="Unfinished work from before today" icon={Clock} error={errors.overdue}>
          <TaskList tasks={data.overdue?.tasks?.slice(0, 8)} emptyText="Nothing overdue." />
          {(data.overdue?.tasks?.length ?? 0) > 8 && (
            <p className="mt-2 text-xs text-slate-500">and {data.overdue!.tasks!.length - 8} more</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function RoadmapTab({ data, errors }: { data: PrepLiveData; errors: PrepLiveOverview['errors'] }) {
  const plans = data.plans?.plans ?? [];
  const themes = data.stats?.weekThemes ?? [];
  const byWeek = data.stats?.byWeek ?? {};

  return (
    <div className="space-y-5">
      <Panel title="Roadmaps" subtitle={`${plans.length} on this account`} icon={Layers} error={errors.plans}>
        {plans.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan._id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="truncate font-semibold text-white">{plan.name ?? 'Roadmap'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {[plan.weeks && `${plan.weeks} weeks`, plan.examGroup].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {plan.startDate ? `Started ${formatDate(plan.startDate)}` : 'Not started'}
                  {plan.targetDate ? ` · Target ${formatDate(plan.targetDate)}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No roadmaps yet.</Empty>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-2" title="This month" subtitle={data.calendar?.month} icon={CalendarDays} error={errors.calendar}>
          <CalendarHeatmap month={data.calendar?.month} days={data.calendar?.days} />
        </Panel>
        <Panel className="lg:col-span-3" title="Week by week" subtitle={data.stats?.planStart ? `${formatDate(data.stats.planStart)} – ${formatDate(data.stats.planEnd)}` : undefined} icon={TrendingUp} error={errors.stats}>
          {themes.length ? (
            <ul className="space-y-3">
              {themes.map((theme) => {
                const week = byWeek[String(theme.week)];
                return (
                  <li key={theme.week}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-300">
                        <span className="font-semibold text-white">Week {theme.week}</span> · {theme.theme ?? theme.category}
                      </span>
                      <span className="shrink-0 text-slate-500">{week?.done ?? 0}/{week?.total ?? 0}</span>
                    </div>
                    <ProgressBar value={ratio(week?.done, week?.total)} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No weekly plan yet.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ProgressTab({ data, errors }: { data: PrepLiveData; errors: PrepLiveOverview['errors'] }) {
  const last14 = data.stats?.last14 ?? [];
  const categories = Object.entries(data.stats?.byCategory ?? {});
  const readiness = data.readiness?.categories ?? [];

  return (
    <div className="space-y-5">
      <ChartFrame
        title="Last 14 days"
        subtitle="Tasks scheduled and completed each day"
        legend={[
          { label: 'Scheduled', color: '#94a3b8' },
          { label: 'Completed', color: '#22c08a' },
        ]}
        isEmpty={last14.length === 0}
        emptyMessage={errors.stats ? `Couldn’t load: ${errors.stats}` : 'No activity in the last two weeks.'}
      >
        <BarChart
          categories={last14.map((day) => formatDate(day.date).replace(/ \d{4}$/, ''))}
          series={[
            { key: 'total', label: 'Scheduled', color: '#94a3b8', values: last14.map((day) => day.total ?? 0) },
            { key: 'done', label: 'Completed', color: '#22c08a', values: last14.map((day) => day.done ?? 0) },
          ]}
          formatValue={(value) => String(Math.round(value))}
        />
      </ChartFrame>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="By subject" subtitle="Share of each subject’s tasks completed" icon={Layers} error={errors.stats}>
          {categories.length ? (
            <ul className="space-y-3">
              {categories.map(([name, value], index) => (
                <li key={name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-300">{name}</span>
                    <span className="text-slate-500">{value.done ?? 0}/{value.total ?? 0}</span>
                  </div>
                  <ProgressBar value={ratio(value.done, value.total)} color={categoricalColor(index)} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No subjects yet.</Empty>
          )}
        </Panel>

        <Panel title="Pace" subtitle={data.pace?.deadline ? `Deadline ${formatDate(data.pace.deadline)}` : undefined} icon={Target} error={errors.pace}>
          {data.pace ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Pill tone={toneFor(data.pace.status)}>{humanize(data.pace.status ?? 'unknown')}</Pill>
                {data.pace.slipDays ? <span className="text-xs text-amber-300">{data.pace.slipDays} days behind schedule</span> : null}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-500">Remaining</dt><dd className="font-semibold text-white">{data.pace.remaining ?? 0} tasks</dd></div>
                <div><dt className="text-xs text-slate-500">Current pace</dt><dd className="font-semibold text-white">{data.pace.pace ?? 0} / day</dd></div>
                <div><dt className="text-xs text-slate-500">Needed</dt><dd className="font-semibold text-white">{data.pace.neededPerDay ?? '—'} / day</dd></div>
                <div><dt className="text-xs text-slate-500">Study days left</dt><dd className="font-semibold text-white">{data.pace.studyDaysLeft ?? '—'}</dd></div>
                <div><dt className="text-xs text-slate-500">Projected finish</dt><dd className="font-semibold text-white">{formatDate(data.pace.projectedFinish)}</dd></div>
                <div><dt className="text-xs text-slate-500">Projected coverage</dt><dd className="font-semibold text-white">{data.pace.projectedCoverage !== null && data.pace.projectedCoverage !== undefined ? `${Math.round(asPercent(data.pace.projectedCoverage))}%` : '—'}</dd></div>
              </dl>
            </div>
          ) : (
            <Empty>No pace data yet.</Empty>
          )}
        </Panel>
      </div>

      <Panel title="Readiness by subject" icon={Gauge} error={errors.readiness}>
        <FinanceTable
          rows={readiness}
          rowKey={(row) => row.category}
          emptyTitle="No readiness data yet"
          columns={[
            { key: 'category', header: 'Subject', render: (row) => <span className="font-medium text-white">{row.category}</span> },
            { key: 'score', header: 'Score', numeric: true, render: (row) => `${Math.round(asPercent(row.score))}%` },
            { key: 'status', header: 'Status', render: (row) => <Pill tone={toneFor(row.status ?? '')}>{humanize(row.status ?? '—')}</Pill> },
            { key: 'coverage', header: 'Coverage', numeric: true, hideOnMobile: true, render: (row) => `${Math.round(asPercent(row.coverage))}%` },
            { key: 'mastery', header: 'Mastery', numeric: true, hideOnMobile: true, render: (row) => `${Math.round(asPercent(row.mastery))}%` },
            { key: 'quiz', header: 'Quiz accuracy', numeric: true, hideOnMobile: true, render: (row) => (row.quizAccuracy === null || row.quizAccuracy === undefined ? '—' : `${Math.round(asPercent(row.quizAccuracy))}%`) },
            { key: 'last', header: 'Last practised', hideOnMobile: true, render: (row) => formatDate(row.lastPractised) },
          ]}
        />
      </Panel>
    </div>
  );
}

function PracticeTab({ data, errors }: { data: PrepLiveData; errors: PrepLiveOverview['errors'] }) {
  const quizzes = data.quizzes?.quizzes ?? [];
  const interviews = data.interviews?.interviews ?? [];
  const boxes = data.flashcardStats?.byBox ?? [];
  const allowance = data.testsOverview?.allowance;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Flashcards" subtitle={`${data.flashcardStats?.due ?? 0} due today of ${data.flashcardStats?.total ?? 0}`} icon={Brain} error={errors.flashcardStats} className="lg:col-span-2">
          {boxes.length ? (
            <BarChart
              categories={boxes.map((_, index) => `Box ${index + 1}`)}
              series={[{ key: 'cards', label: 'Cards', color: '#a78bfa', values: boxes }]}
              formatValue={(value) => String(Math.round(value))}
            />
          ) : (
            <Empty>No flashcards yet.</Empty>
          )}
          <p className="mt-2 text-[11px] text-slate-500">Cards move up a box each time they are remembered; box 5 is mastered.</p>
        </Panel>

        <Panel title="Mock tests" subtitle={data.testsOverview?.examGroup} icon={Trophy} error={errors.testsOverview}>
          {allowance ? (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-400">Used this cycle</span>
                  <span className="font-semibold text-white">{allowance.used ?? 0} of {allowance.limit ?? '∞'}</span>
                </div>
                <ProgressBar value={ratio(allowance.used, allowance.limit)} color="#f0b429" />
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Tier</dt><dd className="text-white">{humanize(allowance.tier ?? '—')}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Resets</dt><dd className="text-white">{formatDate(allowance.resetsOn)}</dd></div>
                {data.testsOverview?.series?.next?.title && (
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Next test</dt><dd className="truncate text-white">{data.testsOverview.series.next.title}</dd></div>
                )}
              </dl>
            </div>
          ) : (
            <Empty>No test data yet.</Empty>
          )}
        </Panel>
      </div>

      <Panel title="Quizzes" subtitle={`${quizzes.length} most recent`} icon={CheckCircle2} error={errors.quizzes}>
        <FinanceTable
          rows={quizzes}
          rowKey={(row) => row._id}
          emptyTitle="No quizzes taken yet"
          maxHeight={420}
          columns={[
            { key: 'date', header: 'Date', render: (row) => <span className="whitespace-nowrap text-slate-300">{formatDate(row.submittedAt ?? row.createdAt)}</span> },
            { key: 'title', header: 'Quiz', render: (row) => <span className="text-slate-200">{row.title || row.category || 'Quiz'}</span> },
            { key: 'mode', header: 'Type', hideOnMobile: true, render: (row) => <Pill tone={row.mode === 'test' ? 'amber' : 'blue'}>{humanize(row.mode ?? 'quiz')}</Pill> },
            { key: 'score', header: 'Score', numeric: true, render: (row) => (row.total ? `${row.correct ?? 0}/${row.total}` : row.score ?? '—') },
            { key: 'status', header: 'Status', align: 'center', render: (row) => <Pill tone={toneFor(row.status ?? '')}>{humanize(row.status ?? '—')}</Pill> },
          ]}
        />
      </Panel>

      <Panel title="Mock interviews" subtitle={`${interviews.length} most recent`} icon={Mic} error={errors.interviews}>
        <FinanceTable
          rows={interviews}
          rowKey={(row) => row._id}
          emptyTitle="No mock interviews yet"
          maxHeight={420}
          columns={[
            { key: 'date', header: 'Date', render: (row) => <span className="whitespace-nowrap text-slate-300">{formatDate(row.createdAt)}</span> },
            { key: 'role', header: 'Role', render: (row) => <span className="text-slate-200">{[row.role, row.level].filter(Boolean).join(' · ') || humanize(row.kind ?? 'Interview')}</span> },
            { key: 'answered', header: 'Answered', numeric: true, hideOnMobile: true, render: (row) => `${row.answered ?? 0}/${row.totalQuestions ?? 0}` },
            { key: 'score', header: 'Score', numeric: true, render: (row) => (row.overallScore === null || row.overallScore === undefined ? '—' : `${Math.round(asPercent(row.overallScore))}%`) },
            { key: 'status', header: 'Status', align: 'center', render: (row) => <Pill tone={toneFor(row.status ?? '')}>{humanize(row.status ?? '—')}</Pill> },
          ]}
        />
      </Panel>
    </div>
  );
}

function JobsTab({ data, errors }: { data: PrepLiveData; errors: PrepLiveOverview['errors'] }) {
  const stages = data.applications?.stages ?? Object.keys(data.applications?.counts ?? {});
  const counts = data.applications?.counts ?? {};
  const applications = data.applications?.applications ?? [];
  const buddies = data.buddies?.buddies ?? [];

  return (
    <div className="space-y-5">
      <Panel title="Pipeline" subtitle={`${data.applications?.followUpsDue ?? 0} follow-ups due`} icon={Briefcase} error={errors.applications}>
        {stages.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {stages.map((stage, index) => (
              <div key={stage} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-xl font-bold text-white" style={{ color: counts[stage] ? categoricalColor(index) : undefined }}>
                  {counts[stage] ?? 0}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{humanize(stage)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No applications tracked yet.</Empty>
        )}
      </Panel>

      <Panel title="Applications" icon={ListChecks} error={errors.applications}>
        <FinanceTable
          rows={applications}
          rowKey={(row) => row._id}
          emptyTitle="No applications yet"
          maxHeight={480}
          columns={[
            { key: 'company', header: 'Company', render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{row.company}</p>
                {row.role && <p className="truncate text-xs text-slate-500">{row.role}</p>}
              </div>
            ) },
            { key: 'stage', header: 'Stage', render: (row) => <Pill tone={toneFor(row.stage ?? '')}>{humanize(row.stage ?? '—')}</Pill> },
            { key: 'applied', header: 'Applied', hideOnMobile: true, render: (row) => formatDate(row.appliedOn) },
            { key: 'next', header: 'Next step', hideOnMobile: true, render: (row) => <span className="text-slate-400">{row.nextStep || '—'}</span> },
            { key: 'follow', header: 'Follow up', render: (row) => formatDate(row.followUpOn) },
          ]}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Referrals" icon={Users} error={errors.referral}>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white/[0.03] p-3"><dd className="text-xl font-bold text-white">{data.referral?.count ?? 0}</dd><dt className="text-[10px] uppercase text-slate-500">Invited</dt></div>
            <div className="rounded-lg bg-white/[0.03] p-3"><dd className="text-xl font-bold text-white">{data.referral?.bonusDaysEarned ?? 0}</dd><dt className="text-[10px] uppercase text-slate-500">Bonus days</dt></div>
            <div className="rounded-lg bg-white/[0.03] p-3"><dd className="truncate font-mono text-sm font-bold text-white">{data.referral?.code ?? '—'}</dd><dt className="text-[10px] uppercase text-slate-500">Code</dt></div>
          </dl>
        </Panel>

        <Panel title="Study buddies" subtitle={`${buddies.length} connected`} icon={Users} error={errors.buddies}>
          {buddies.length ? (
            <ul className="divide-y divide-white/5">
              {buddies.map((buddy) => (
                <li key={buddy.id} className="flex items-center gap-3 py-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200">
                    {(buddy.name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                    {buddy.name}{buddy.isYou && <span className="text-slate-500"> (you)</span>}
                  </span>
                  <span className="text-xs text-slate-400">🔥 {buddy.streak ?? 0}</span>
                  <span className="text-xs text-slate-500">{buddy.doneThisWeek ?? 0} this week</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No study buddies yet.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------- connect form ------------------------------ */

function ConnectCard({ platformName, onConnect }: { platformName: string; onConnect: (input: { baseUrl: string; email: string; password: string }) => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onConnect({
        baseUrl: String(form.get('baseUrl') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-5">
        <div className="bg-gradient-to-br from-brand-500/20 via-brand-700/10 to-transparent p-6 lg:col-span-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/30">
            <PlugZap className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-white">Connect {platformName}’s live data</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Sign in with a {platformName} account once. Its roadmap, progress, practice and job-hunt data then appear
            here and refresh on every visit.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
            <li>• The password is used once to sign in and is never stored.</li>
            <li>• Only an encrypted session token is kept, and only read-only data is fetched.</li>
            <li>• The connection lasts while it is used at least once a week.</li>
            <li>• Works with platforms built on the EsscentraPrep API.</li>
          </ul>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6 lg:col-span-3">
          <Input label="API base URL" name="baseUrl" defaultValue={DEFAULT_PREP_API} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Account email" name="email" type="email" required autoComplete="off" />
            <Input label="Password" name="password" type="password" required autoComplete="new-password" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">The first connection can take up to a minute while the service wakes.</p>
            <Button type="submit" loading={busy}>
              <PlugZap className="h-4 w-4" /> Connect
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------- page ----------------------------------- */

export default function PlatformDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const [row, setRow] = useState<EcosystemPlatformRow | null>(null);
  const [detail, setDetail] = useState<PlatformDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [live, setLive] = useState<PrepLiveOverview | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [plan, setPlan] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const loadPlatform = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await getEcosystemOverview();
      const match = overview.platforms.find((p) => p.slug === slug) ?? null;
      setRow(match);
      setDetail(match ? await getEcosystemPlatform(match.id) : null);
      if (!match) setError('This sub-product does not exist, or it was removed.');
    } catch (thrown) {
      setError(getErrorMessage(thrown));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setLive(null);
    setPlan('');
    setTab('overview');
    void loadPlatform();
  }, [loadPlatform]);

  const connected = Boolean(detail?.integration?.provider);

  const loadLive = useCallback(async () => {
    if (!row || !connected || !isSuperAdmin) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      setLive(await getPlatformLiveOverview(row.id, plan || undefined));
    } catch (thrown) {
      setLiveError(getErrorMessage(thrown));
    } finally {
      setLiveLoading(false);
    }
  }, [row, connected, isSuperAdmin, plan]);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  const onConnect = async (input: { baseUrl: string; email: string; password: string }) => {
    if (!row) return;
    try {
      setDetail(await connectPlatformLive(row.id, input));
      window.dispatchEvent(new Event(ECOSYSTEM_CHANGED_EVENT));
      toast.success('Connected', `${row.name}’s live data is now linked.`);
    } catch (thrown) {
      toast.error('Could not connect', getErrorMessage(thrown));
    }
  };

  const onDisconnect = async () => {
    if (!row || !window.confirm(`Disconnect ${row.name}’s live data? You can reconnect any time.`)) return;
    try {
      await disconnectPlatformLive(row.id);
      setLive(null);
      window.dispatchEvent(new Event(ECOSYSTEM_CHANGED_EVENT));
      await loadPlatform();
      toast.info('Disconnected');
    } catch (thrown) {
      toast.error('Could not disconnect', getErrorMessage(thrown));
    }
  };

  const plans = live?.data.plans?.plans ?? [];
  const accountName = live?.data.me?.user?.name ?? detail?.integration?.accountName ?? detail?.integration?.accountEmail;

  const tabContent = useMemo(() => {
    if (!live) return null;
    const props = { data: live.data, errors: live.errors };
    switch (tab) {
      case 'roadmap':
        return <RoadmapTab {...props} />;
      case 'progress':
        return <ProgressTab {...props} />;
      case 'practice':
        return <PracticeTab {...props} />;
      case 'jobs':
        return <JobsTab {...props} />;
      default:
        return <OverviewTab {...props} />;
    }
  }, [live, tab]);

  if (loading && !row) {
    return (
      <div className="space-y-6">
        <div className="glass-card h-40 animate-pulse" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (error || !row) {
    return <ErrorState title="Sub-product not found" message={error ?? 'Not found.'} onRetry={() => void loadPlatform()} />;
  }

  return (
    <div className="space-y-6">
      {/* --------------------------------- hero -------------------------------- */}
      <div className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <Link to="/app/ecosystem" className="relative inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Ecosystem overview
        </Link>
        <div className="relative mt-4 flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <PlatformLogo
              slug={row.slug}
              name={row.name}
              className="h-16 w-16 rounded-2xl shadow-lg shadow-brand-900/40"
              letterClassName="text-2xl font-black"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-bold text-white sm:text-3xl">{row.name}</h1>
                <Pill tone={STATUS_TONE[row.status]}>{humanize(row.status)}</Pill>
                {connected && (
                  <Pill tone={detail?.integration?.lastError ? 'amber' : 'green'}>
                    {detail?.integration?.lastError ? 'Reconnect needed' : 'Live'}
                  </Pill>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                {detail?.description || row.category || 'A product in the Esscentra ecosystem.'}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {row.category && <span>{row.category}</span>}
                {row.launchedAt && <span>Launched {formatDate(row.launchedAt)}</span>}
                {row.website && (
                  <a href={row.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200">
                    {row.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------- business ------------------------------ */}
      <BusinessSection platformId={row.id} platformName={row.name} isSuperAdmin={isSuperAdmin} />

      {/* -------------------------------- ledger ------------------------------- */}
      <h2 className="-mb-2 text-base font-semibold text-white">Ledger</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard icon={Users} label="Users (recorded)" value={row.userCount.toLocaleString('en-IN')} hint="Entered on the hub by hand" tone="brand" />
        <FinanceCard icon={IndianRupee} label="Ledger revenue" value={row.revenueTotal} format={inr} hint="Entered on the hub by hand" tone="green" />
        <FinanceCard icon={TrendingUp} label="This month" value={row.thisMonth} format={inr} tone="violet" />
        <FinanceCard icon={Layers} label="Flows to Esscentra" value={row.parentAmount} format={inr} hint={`${row.parentPercent}% of revenue`} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-2" title="Revenue agreement" subtitle="Tier 1: paid before the remainder flows to Esscentra" icon={IndianRupee}>
          <ul className="space-y-3">
            {row.shareLines.map((line) => (
              <li key={line.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">{line.name}</span>
                  <span className="text-slate-500">{line.percent}% · {inr(line.amount)}</span>
                </div>
                <ProgressBar value={line.percent} />
              </li>
            ))}
            <li>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">Esscentra (remainder)</span>
                <span className="text-slate-500">{row.parentPercent}% · {inr(row.parentAmount)}</span>
              </div>
              <ProgressBar value={row.parentPercent} color="#f0b429" />
            </li>
          </ul>
          {row.parentPercent === 0 && (
            <p className="mt-3 text-xs text-amber-300">Nothing from this platform reaches Esscentra or its investors under this agreement.</p>
          )}
        </Panel>
        <ChartFrame className="lg:col-span-3" title="Monthly revenue" subtitle="From the hub’s revenue ledger" isEmpty={!detail?.monthly?.length} emptyMessage="No revenue recorded yet.">
          <BarChart
            categories={[...(detail?.monthly ?? [])].reverse().map((m) => m.period)}
            series={[{ key: 'revenue', label: 'Revenue', color: '#3f7bfd', values: [...(detail?.monthly ?? [])].reverse().map((m) => m.amount) }]}
            formatValue={inr}
          />
        </ChartFrame>
      </div>

      {/* ------------------------------ live data ------------------------------ */}
      {!isSuperAdmin ? (
        connected ? (
          <InfoNote tone="info">Live product data for {row.name} is visible to super admins.</InfoNote>
        ) : null
      ) : !connected ? (
        <ConnectCard platformName={row.name} onConnect={onConnect} />
      ) : (
        <section className="space-y-5">
          <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                <PlugZap className="h-5 w-5" />
                {!detail?.integration?.lastError && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Live data · {accountName}</p>
                <p className="truncate text-xs text-slate-500">
                  {live ? `Updated ${formatDateTime(live.fetchedAt)}` : liveLoading ? 'Loading…' : detail?.integration?.baseUrl}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {plans.length > 1 && (
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  className="select-field h-9 rounded-lg border border-white/10 bg-white/[0.05] px-2 text-xs text-slate-200 outline-none"
                  aria-label="Roadmap"
                >
                  <option value="">All roadmaps</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name ?? 'Roadmap'}</option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="secondary" onClick={() => void loadLive()} loading={liveLoading}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <button
                type="button"
                onClick={() => void onDisconnect()}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                title="Disconnect live data"
                aria-label="Disconnect live data"
              >
                <Unplug className="h-4 w-4" />
              </button>
            </div>
          </div>

          {liveError && !live ? (
            liveError.toLowerCase().includes('reconnect') ? (
              <>
                <InfoNote tone="warning">{liveError}</InfoNote>
                <ConnectCard platformName={row.name} onConnect={onConnect} />
              </>
            ) : (
              <ErrorState title="Live data is unavailable" message={liveError} onRetry={() => void loadLive()} />
            )
          ) : !live ? (
            <>
              <CardGridSkeleton />
              <div className="glass-card h-64 animate-pulse" />
            </>
          ) : (
            <>
              <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                      tab === item.key
                        ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 text-white shadow'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
              {Object.keys(live.errors).length > 0 && (
                <InfoNote tone="warning">
                  {Object.keys(live.errors).length} part(s) could not be loaded this time; the rest is current.
                </InfoNote>
              )}
              <div className={cn('transition-opacity', liveLoading && 'opacity-60')}>{tabContent}</div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
