import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FolderKanban,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { useAuth } from '@/context/AuthContext';
import { getClientOverview, type ClientOverview } from '@/lib/clientApi';
import { useClientData } from './useClientData';
import { humanize, inr } from '@/lib/format';

/**
 * ============================================================================
 *  CLIENT OVERVIEW
 * ============================================================================
 *
 * The landing page answers three questions in order: is my work on track,
 * what do I owe, and is anyone dealing with what I asked. Everything else is
 * one click away.
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

export default function ClientOverviewPage() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const { data, loading, error, reload } = useClientData<ClientOverview>(
    () => getClientOverview(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your account" title="Overview" />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your account" title="Overview" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const { company, projects, documents, billing, tickets } = data;

  return (
    <div className="space-y-7">
      {/* ------------------------------- hero -------------------------------- */}
      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: 'rgba(47, 109, 240, 0.4)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'rgba(139, 92, 246, 0.35)' }}
          aria-hidden
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
              Welcome back, {firstName}
            </p>
            <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400/30 to-brand-700/15 text-brand-200 ring-1 ring-brand-400/30">
                {company.logo ? (
                  <img src={company.logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </span>
              {company.name}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {[company.industry, company.location].filter(Boolean).join(' · ') ||
                'Your engagement with Esscentra'}
            </p>
          </div>

          <div className="flex flex-wrap gap-6">
            <Headline
              label="Projects running"
              value={String(projects.active)}
              hint={`${projects.total} in total`}
            />
            <Headline
              label="Delivered"
              value={String(projects.ended)}
              hint={
                projects.onTimeDeliveryPercent === null
                  ? 'none closed yet'
                  : `${projects.onTimeDeliveryPercent}% on time`
              }
            />
            <Headline
              label="People on your work"
              value={String(projects.teamSize)}
              hint="across every project"
            />
          </div>
        </div>
      </section>

      {billing.outstandingCount > 0 && (
        <InfoNote tone="warning">
          {inr(billing.outstandingAmount)} across {billing.outstandingCount}{' '}
          invoice{billing.outstandingCount === 1 ? '' : 's'} is awaiting payment.
          Every invoice is in your Documents tab.
        </InfoNote>
      )}

      {/* ------------------------------- cards ------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={FolderKanban}
          label="Active projects"
          value={projects.active}
          hint={projects.onHold > 0 ? `${projects.onHold} on hold` : 'all moving'}
          tone="brand"
        />
        <FinanceCard
          icon={Wallet}
          label="Outstanding"
          value={billing.outstandingAmount}
          format={inr}
          hint={`${billing.outstandingCount} invoice${billing.outstandingCount === 1 ? '' : 's'} open`}
          tone={billing.outstandingCount > 0 ? 'amber' : 'green'}
        />
        <FinanceCard
          icon={FileSignature}
          label="Documents"
          value={documents.total}
          hint={`${documents.agreements} agreements · ${documents.invoices + documents.bills} billing`}
          tone="teal"
        />
        <FinanceCard
          icon={LifeBuoy}
          label="Open tickets"
          value={tickets.open + tickets.inProgress}
          hint={`${tickets.total} raised in total`}
          tone={tickets.open > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* ------------------------------ coming up ----------------------------- */}
      <Section
        title="Landing next"
        description="Your nearest delivery dates, soonest first."
      >
        {projects.upcoming.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-base font-semibold text-white">
              Nothing scheduled
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Projects with a delivery date will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.upcoming.map((project) => (
              <Link
                key={project.id}
                to="/app/client/projects"
                className="glass-card card-lift group flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-semibold text-white">
                    {project.name}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 translate-x-0 text-brand-300 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Due {ddmmyyyy(project.expectedEndDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.teamSize} on the team
                    </span>
                    {project.projectLead && (
                      <span className="truncate">Led by {project.projectLead.name}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden w-32 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600"
                        style={{ width: `${Math.min(100, project.percent)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] tabular-nums text-slate-500">
                      {project.percent}% done
                    </p>
                  </div>
                  <Pill tone={project.status === 'ON_HOLD' ? 'amber' : 'blue'}>
                    {humanize(project.status)}
                  </Pill>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* ------------------------------ shortcuts ----------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            to: '/app/client/projects',
            label: 'My projects',
            icon: FolderKanban,
            hint: 'Timelines, leads and delivery',
          },
          {
            to: '/app/client/documents',
            label: 'Documents',
            icon: Receipt,
            hint: 'Agreements, invoices and bills',
          },
          {
            to: '/app/tickets',
            label: 'Support',
            icon: LifeBuoy,
            hint: 'Ask us anything',
          },
          {
            to: '/kyc',
            label: 'Verification',
            icon: ShieldCheck,
            hint: 'Complete your KYC',
          },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="glass-card card-lift group flex items-start gap-3 p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
              <link.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {link.label}
                <ArrowRight className="h-3.5 w-3.5 translate-x-0 text-brand-300 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{link.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* -------------------------------- billing ----------------------------- */}
      <Section title="Billing at a glance" description="Issued to your company.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400/25 to-amber-700/10 text-amber-200 ring-1 ring-amber-400/30">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold tabular-nums text-white">
                {inr(billing.outstandingAmount)}
              </p>
              <p className="text-xs text-slate-400">
                awaiting payment · {billing.outstandingCount} invoice
                {billing.outstandingCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="glass-card flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-700/10 text-emerald-200 ring-1 ring-emerald-400/30">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-xl font-bold tabular-nums text-white">
                {inr(billing.settledAmount)}
              </p>
              <p className="text-xs text-slate-400">
                settled · {billing.settledCount} invoice
                {billing.settledCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Headline({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <p className="font-display text-3xl font-bold leading-none tabular-nums text-white">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}
