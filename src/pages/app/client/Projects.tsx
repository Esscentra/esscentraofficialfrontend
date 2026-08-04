import { useState } from 'react';
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Flag,
  PauseCircle,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState } from '@/components/finance/States';
import { getClientProjects, type ClientProject } from '@/lib/clientApi';
import { useClientData } from './useClientData';
import { humanize } from '@/lib/format';

/**
 * ============================================================================
 *  MY PROJECTS
 * ============================================================================
 *
 * Every project running for this company, with the two things a client
 * actually wants side by side: how much of the promised time has gone, and
 * how much of the work is done. The gap between those two bars is the story.
 *
 * Ended projects move to their own tab and show promised-vs-actual delivery,
 * because "we finished" means very little without "when we said we would".
 * ============================================================================
 */

function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

const STATUS_TONE: Record<string, 'gray' | 'blue' | 'green' | 'amber' | 'red'> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'blue',
  ON_HOLD: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'gray',
};

/** How the delivery landed, in the words a client would use. */
function deliveryLabel(days: number | null): {
  text: string;
  tone: 'green' | 'amber' | 'red';
} {
  if (days === null) return { text: 'Delivered', tone: 'green' };
  if (days < 0)
    return { text: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} early`, tone: 'green' };
  if (days === 0) return { text: 'On time', tone: 'green' };
  if (days <= 7) return { text: `${days} day${days === 1 ? '' : 's'} late`, tone: 'amber' };
  return { text: `${days} days late`, tone: 'red' };
}

type Tab = 'ACTIVE' | 'ENDED' | 'ALL';

export default function ClientProjects() {
  const [tab, setTab] = useState<Tab>('ACTIVE');

  const { data, loading, error, reload } = useClientData<ClientProject[]>(
    () => getClientProjects(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your engagement" title="My projects" />
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your engagement" title="My projects" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const active = data.filter((p) => !p.isEnded && p.status !== 'CANCELLED');
  const ended = data.filter((p) => p.isEnded);
  const rows = tab === 'ACTIVE' ? active : tab === 'ENDED' ? ended : data;

  const onTime = ended.filter((p) => (p.deliveryVarianceDays ?? 0) <= 0).length;

  const TABS: Array<{ value: Tab; label: string; count: number }> = [
    { value: 'ACTIVE', label: 'In flight', count: active.length },
    { value: 'ENDED', label: 'Ended', count: ended.length },
    { value: 'ALL', label: 'All', count: data.length },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your engagement"
        title="My projects"
        subtitle="Where every piece of work stands, who is leading it, and when it lands."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={CircleDot}
          label="In flight"
          value={active.length}
          hint={`${data.length} projects in total`}
          tone="brand"
        />
        <FinanceCard
          icon={CheckCircle2}
          label="Delivered"
          value={ended.length}
          hint={
            ended.length > 0
              ? `${Math.round((onTime / ended.length) * 100)}% on time`
              : 'Nothing closed yet'
          }
          tone="green"
        />
        <FinanceCard
          icon={PauseCircle}
          label="On hold"
          value={data.filter((p) => p.status === 'ON_HOLD').length}
          hint="Paused for now"
          tone="amber"
        />
        <FinanceCard
          icon={Users}
          label="People on your work"
          value={data.reduce((sum, p) => sum + p.teamSize, 0)}
          hint="Across every project"
          tone="violet"
        />
      </div>

      {/* -------------------------------- tabs -------------------------------- */}
      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {TABS.map((entry) => {
          const isActive = tab === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => setTab(entry.value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {entry.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  isActive ? 'bg-white/20 !text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {entry.count}
              </span>
            </button>
          );
        })}
      </div>

      <Section
        title={tab === 'ENDED' ? 'Delivered work' : 'Your projects'}
        description={
          tab === 'ENDED'
            ? 'Closed out, with what we promised against what we delivered.'
            : 'Time elapsed against work completed — the two bars tell you where things really are.'
        }
      >
        {rows.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-base font-semibold text-white">
              {tab === 'ENDED' ? 'Nothing delivered yet' : 'No projects yet'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {tab === 'ENDED'
                ? 'Completed projects will be archived here with their delivery dates.'
                : 'Work started for your company will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {rows.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ProjectCard({ project }: { project: ClientProject }) {
  const delivery = project.isEnded
    ? deliveryLabel(project.deliveryVarianceDays)
    : null;

  // Behind = more of the clock gone than of the work done. Worth surfacing
  // gently rather than hiding: the client will work it out anyway.
  const behind =
    !project.isEnded &&
    project.timelinePercent > 0 &&
    project.timelinePercent - project.percent >= 20;

  return (
    <article className="glass-card card-lift relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-25 blur-3xl"
        style={{
          background: project.isEnded
            ? 'rgba(16, 185, 129, 0.35)'
            : 'rgba(47, 109, 240, 0.35)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold text-white">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-400">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {delivery && <Pill tone={delivery.tone}>{delivery.text}</Pill>}
          <Pill tone={STATUS_TONE[project.status] ?? 'gray'}>
            {humanize(project.status)}
          </Pill>
        </div>
      </div>

      {/* ------------------------------- the facts ------------------------------ */}
      <dl className="relative mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            Started
          </dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-200">
            {ddmmyyyy(project.startDate)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <Flag className="h-3.5 w-3.5" />
            {project.isEnded ? 'Was due' : 'Expected end'}
          </dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-200">
            {ddmmyyyy(project.expectedEndDate)}
          </dd>
        </div>
        {project.isEnded ? (
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Delivered
            </dt>
            <dd className="mt-1 font-semibold tabular-nums text-emerald-300">
              {ddmmyyyy(project.endedAt)}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Time left
            </dt>
            <dd
              className={`mt-1 font-semibold tabular-nums ${
                (project.daysRemaining ?? 0) < 0 ? 'text-rose-300' : 'text-slate-200'
              }`}
            >
              {project.daysRemaining === null
                ? '—'
                : project.daysRemaining < 0
                  ? `${Math.abs(project.daysRemaining)}d over`
                  : `${project.daysRemaining} days`}
            </dd>
          </div>
        )}
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <Users className="h-3.5 w-3.5" />
            Team
          </dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-200">
            {project.teamSize} {project.teamSize === 1 ? 'person' : 'people'}
          </dd>
        </div>
      </dl>

      {/* -------------------------------- timeline ------------------------------ */}
      <div className="relative mt-5 space-y-3">
        <Meter
          label="Timeline"
          percent={project.timelinePercent}
          tone={project.isEnded ? 'emerald' : behind ? 'amber' : 'brand'}
          caption={
            project.totalDays
              ? `${Math.max(0, project.elapsedDays ?? 0)} of ${project.totalDays} days`
              : 'No dates set'
          }
        />
        <Meter
          label="Work completed"
          percent={project.percent}
          tone="violet"
          caption={
            project.taskTotal > 0
              ? `${project.taskCompleted} of ${project.taskTotal} items`
              : 'Not itemised'
          }
        />
      </div>

      {behind && (
        <p className="relative mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
          More of the schedule has gone than of the work. Your project lead can
          talk you through it.
        </p>
      )}

      {project.endSummary && (
        <p className="relative mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs leading-relaxed text-emerald-100/90">
          {project.endSummary}
        </p>
      )}

      {/* ---------------------------------- lead -------------------------------- */}
      <div className="relative mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400/30 to-brand-700/15 text-brand-200 ring-1 ring-brand-400/30">
          {project.projectLead?.profileImage ? (
            <img
              src={project.projectLead.profileImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            Project lead
          </p>
          <p className="truncate text-sm font-medium text-slate-200">
            {project.projectLead?.name ?? 'To be assigned'}
          </p>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

const METER_TONE: Record<string, string> = {
  brand: 'from-brand-400 to-brand-600',
  violet: 'from-violet-400 to-violet-600',
  emerald: 'from-emerald-400 to-emerald-600',
  amber: 'from-amber-400 to-amber-600',
};

function Meter({
  label,
  percent,
  tone,
  caption,
}: {
  label: string;
  percent: number;
  tone: keyof typeof METER_TONE;
  caption: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-slate-400">
          {caption} · {clamped}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${METER_TONE[tone]} transition-all duration-700`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
