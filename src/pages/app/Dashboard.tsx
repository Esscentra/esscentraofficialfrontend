import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building,
  Building2,
  Coins,
  FileText,
  FolderArchive,
  FolderKanban,
  HandCoins,
  History,
  IndianRupee,
  ListChecks,
  Mail,
  MessageSquare,
  ShieldHalf,
  Target,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import {
  canAccessAppPath,
  isAdminRole,
  isInvestorRole,
  isMarketerRole,
  isSuperAdminRole,
} from '@/lib/utils';
import InvestorOverview from './investor/Overview';
import MarketerDashboard from './MarketerDashboard';

type Card = {
  to: string;
  label: string;
  icon: typeof Users;
  hint: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

const CARDS: Card[] = [
  { to: '/app/leads', label: 'Leads', icon: Users, hint: 'Capture and qualify prospects' },
  { to: '/app/opportunities', label: 'Opportunities', icon: Target, hint: 'Track deals through stages' },
  { to: '/app/accounts', label: 'Accounts', icon: Building, hint: 'Companies you work with' },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban, hint: 'Plan and deliver work' },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks, hint: 'Your to-dos and assignments' },
  { to: '/app/contacts', label: 'Contacts', icon: Building2, hint: 'People at your accounts' },
  { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare, hint: 'Inbound contact requests' },
  { to: '/app/blog', label: 'Blog', icon: FileText, hint: 'Write and publish posts', adminOnly: true },
  { to: '/app/newsletter', label: 'Newsletter', icon: Mail, hint: 'Manage subscribers', adminOnly: true },
  // Admin governance
  { to: '/app/users', label: 'Users', icon: UserCog, hint: 'Manage members and roles', adminOnly: true },
  { to: '/app/kyc-review', label: 'KYC Review', icon: BadgeCheck, hint: 'Verify identity submissions', adminOnly: true },
  { to: '/app/investments', label: 'Investments', icon: IndianRupee, hint: 'Record contributions & invoices', adminOnly: true },
  { to: '/app/commitments', label: 'Commitments', icon: HandCoins, hint: 'Pledges, installments & spending', adminOnly: true },
  // Investor finance: the figures every investor dashboard reads from.
  { to: '/app/finance/revenue', label: 'Revenue', icon: IndianRupee, hint: 'Record client payments', adminOnly: true },
  { to: '/app/finance/expenses', label: 'Expenses', icon: Wallet, hint: 'Approve business costs', adminOnly: true },
  { to: '/app/finance/valuation', label: 'Valuation', icon: Building2, hint: 'Set company worth & cap table', adminOnly: true },
  { to: '/app/finance/distributions', label: 'Distributions', icon: Coins, hint: 'Approve & pay profit shares', adminOnly: true },
  { to: '/app/finance/documents', label: 'Investor docs', icon: FolderArchive, hint: 'Agreements & certificates', adminOnly: true },
  { to: '/app/finance/audit', label: 'Audit trail', icon: History, hint: 'Every financial change', adminOnly: true },
  { to: '/app/roles', label: 'Roles', icon: ShieldHalf, hint: 'Define team access roles', superAdminOnly: true },
];

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const isAdmin = isAdminRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const role = user?.role;
  const cards = useMemo(
    () =>
      CARDS.filter((c) => {
        // Narrow-surface roles (see RESTRICTED_ROLE_PATHS) only get their own
        // pages — never a card linking somewhere they'd be bounced out of.
        if (!canAccessAppPath(role, c.to)) return false;
        if (c.superAdminOnly) return isSuperAdmin;
        if (c.adminOnly) return isAdmin;
        return true;
      }),
    [isAdmin, isSuperAdmin, role],
  );

  // Narrow-surface roles get a purpose-built overview instead of the workspace
  // card grid, which would mostly link to pages they cannot open.
  // (Placed after the hooks above so hook order stays stable.)
  // The investor's landing page is the full finance overview — position,
  // valuation, profit share and ROI. Their original records view (commitments,
  // invoices and fund usage) lives on at /app/investor/records.
  if (isInvestorRole(user?.role)) {
    return <InvestorOverview />;
  }
  if (isMarketerRole(user?.role)) {
    return <MarketerDashboard />;
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Jump into any workspace below."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="glass-card card-lift group flex items-start gap-4 p-5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30 transition-colors duration-200 group-hover:from-brand-400/40 group-hover:to-brand-700/20 group-hover:text-brand-200">
              <c.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 font-semibold text-white">
                {c.label}
                <span
                  className="translate-x-0 text-brand-300 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                  aria-hidden
                >
                  →
                </span>
              </h3>
              <p className="mt-0.5 text-sm text-slate-400">{c.hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
