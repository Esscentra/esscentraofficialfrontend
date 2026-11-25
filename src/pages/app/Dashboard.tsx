import { lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  LifeBuoy,
  MessageSquare,
  ScrollText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import {
  canAccessAppPath,
  cn,
  isAdminRole,
  isClientRole,
  isInvestorRole,
  isMarketerRole,
} from '@/lib/utils';
import { inr } from '@/lib/format';
import { listPendingKyc } from '@/lib/kycApi';
import { listInquiries } from '@/lib/inquiryApi';
import { listInvoices } from '@/lib/invoiceApi';
import { listTickets } from '@/lib/marketerApi';
import { listCommitments } from '@/lib/commitmentApi';
import { listTasks } from '@/lib/taskApi';

// Each role sees one of these, so nobody downloads the others (or their
// chart code) just by opening the app.
const InvestorOverview = lazy(() => import('./investor/Overview'));
const MarketerOverview = lazy(() => import('./marketer/Overview'));
const ClientOverview = lazy(() => import('./client/Overview'));

/** One "needs attention" check: how many things are waiting, and where. */
interface Check {
  key: string;
  /** Page name, used when the check cannot load. */
  name: string;
  to: string;
  icon: typeof BadgeCheck;
  /** "3 KYC submissions to review" — given the count. */
  label: (count: number) => string;
  /** Shown when the count is zero. */
  clear: string;
  adminOnly?: boolean;
  /** Resolves to the count, plus an optional detail line. */
  load: () => Promise<{ count: number; detail?: string }>;
}

const DAY_MS = 86_400_000;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const CHECKS: Check[] = [
  {
    key: 'inquiries',
    name: 'Inquiries',
    to: '/app/inquiries',
    icon: MessageSquare,
    label: (n) => `${n} new ${plural(n, 'inquiry', 'inquiries')}`,
    clear: 'No new inquiries',
    load: async () => {
      const rows = await listInquiries();
      return { count: rows.filter((r) => r.status === 'NEW').length };
    },
  },
  {
    key: 'tasks',
    name: 'Tasks',
    to: '/app/tasks',
    icon: CalendarClock,
    label: (n) => `${n} ${plural(n, 'task', 'tasks')} due this week`,
    clear: 'Nothing due this week',
    load: async () => {
      const page = await listTasks({ limit: 100 });
      const now = Date.now();
      const open = page.tasks.filter(
        (t) => t.dueDate && (t.status === 'PENDING' || t.status === 'IN_PROGRESS'),
      );
      const dueSoon = open.filter((t) => new Date(t.dueDate!).getTime() <= now + 7 * DAY_MS);
      const overdue = dueSoon.filter((t) => new Date(t.dueDate!).getTime() < now).length;
      return {
        count: dueSoon.length,
        detail: overdue ? `${overdue} already overdue` : undefined,
      };
    },
  },
  {
    key: 'kyc',
    name: 'KYC review',
    to: '/app/kyc-review',
    icon: BadgeCheck,
    label: (n) => `${n} KYC ${plural(n, 'submission', 'submissions')} to review`,
    clear: 'No KYC waiting',
    adminOnly: true,
    load: async () => ({ count: (await listPendingKyc()).length }),
  },
  {
    key: 'instalments',
    name: 'Commitments',
    to: '/app/commitments',
    icon: HandCoins,
    label: (n) => `${n} overdue ${plural(n, 'instalment', 'instalments')}`,
    clear: 'No overdue instalments',
    adminOnly: true,
    load: async () => {
      const now = Date.now();
      const overdue = (await listCommitments()).filter(
        (c) => c.status === 'ACTIVE' && c.nextDueDate && new Date(c.nextDueDate).getTime() < now,
      );
      return { count: overdue.length };
    },
  },
  {
    key: 'invoices',
    name: 'Invoices',
    to: '/app/finance/invoices',
    icon: ScrollText,
    label: (n) => `${n} unpaid ${plural(n, 'invoice', 'invoices')}`,
    clear: 'Every invoice is paid',
    adminOnly: true,
    load: async () => {
      const { summary } = await listInvoices({ limit: 1 });
      return {
        count: summary.outstandingCount,
        detail: summary.outstandingCount ? `${inr(summary.outstandingAmount)} outstanding` : undefined,
      };
    },
  },
  {
    key: 'tickets',
    name: 'Support tickets',
    to: '/app/tickets',
    icon: LifeBuoy,
    label: (n) => `${n} open support ${plural(n, 'ticket', 'tickets')}`,
    clear: 'No open tickets',
    adminOnly: true,
    load: async () => {
      const { summary } = await listTickets();
      return { count: summary.open + summary.inProgress };
    },
  },
];

type Result =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; count: number; detail?: string };

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';
  const role = user?.role;

  const isAdmin = isAdminRole(role);
  // Narrow-surface roles get their own overview below; an account with no
  // role yet can open nothing but this page.
  const isTeam =
    !isInvestorRole(role) && !isClientRole(role) && !isMarketerRole(role) &&
    canAccessAppPath(role, '/app/tasks');
  const checks = isTeam ? CHECKS.filter((c) => !c.adminOnly || isAdmin) : [];

  const [results, setResults] = useState<Record<string, Result>>({});

  useEffect(() => {
    if (checks.length === 0) return;
    let active = true;
    setResults(Object.fromEntries(checks.map((c) => [c.key, { state: 'loading' }])));
    checks.forEach((check) => {
      check
        .load()
        .then((r) => active && setResults((prev) => ({ ...prev, [check.key]: { state: 'ready', ...r } })))
        .catch(() => active && setResults((prev) => ({ ...prev, [check.key]: { state: 'error' } })));
    });
    return () => {
      active = false;
    };
    // checks is derived from role alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // (Placed after the hooks above so hook order stays stable.)
  if (isInvestorRole(role)) return <InvestorOverview />;
  if (isClientRole(role)) return <ClientOverview />;
  if (isMarketerRole(role)) return <MarketerOverview />;

  if (!isTeam) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${firstName}`}
          subtitle="Your account is active, but no workspace has been assigned to it yet."
        />
        <p className="glass-card p-5 text-sm text-slate-400">
          An administrator needs to give your account a role before you can use the
          workspace. Your profile and KYC stay available in the meantime.
        </p>
      </div>
    );
  }

  const loaded = checks.map((c) => results[c.key]);
  const allReady = loaded.every((r) => r?.state === 'ready');
  const waiting = checks.filter((c) => {
    const r = results[c.key];
    return r?.state === 'ready' && r.count > 0;
  });
  // Things waiting first, then errors, then the all-clear ones.
  const rank = (c: Check) => {
    const r = results[c.key];
    if (r?.state === 'ready') return r.count > 0 ? 0 : 3;
    return r?.state === 'error' ? 2 : 1;
  };
  const ordered = [...checks].sort((a, b) => rank(a) - rank(b));

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={
          allReady
            ? waiting.length
              ? `${waiting.length} ${plural(waiting.length, 'thing needs', 'things need')} your attention.`
              : 'All clear — nothing is waiting on you.'
            : 'Checking what needs your attention…'
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((check) => {
          const r = results[check.key] ?? { state: 'loading' };
          const hot = r.state === 'ready' && r.count > 0;
          return (
            <Link
              key={check.key}
              to={check.to}
              className={cn(
                'glass-card card-lift group flex items-start gap-4 p-5',
                !hot && r.state === 'ready' && 'opacity-70 hover:opacity-100',
              )}
            >
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1',
                  hot
                    ? 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
                    : 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
                  r.state !== 'ready' && 'bg-white/[0.04] text-slate-400 ring-white/10',
                )}
              >
                {r.state === 'ready' && !hot ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <check.icon className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {r.state === 'loading' && (
                  <div className="mt-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                  </div>
                )}
                {r.state === 'error' && (
                  <>
                    <h3 className="font-semibold text-white">{check.name}</h3>
                    <p className="mt-0.5 text-sm text-slate-400">Couldn't check — open the page</p>
                  </>
                )}
                {r.state === 'ready' && (
                  <>
                    <h3 className="flex items-center gap-1.5 font-semibold text-white">
                      {hot ? check.label(r.count) : check.clear}
                      <span
                        className="text-brand-300 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                        aria-hidden
                      >
                        →
                      </span>
                    </h3>
                    {r.detail && <p className="mt-0.5 text-sm text-slate-400">{r.detail}</p>}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
