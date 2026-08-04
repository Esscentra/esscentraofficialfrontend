import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Building,
  Building2,
  Calculator,
  CalendarClock,
  Coins,
  FileText,
  FolderArchive,
  FolderKanban,
  HandCoins,
  History,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy,
  PieChart,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldHalf,
  TrendingUp,
  Trophy,
  UserCircle,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AuroraBackground } from './AuroraBackground';
import { NotificationBell } from './NotificationBell';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ui/ThemeSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './ui/Toast';
import { Avatar } from './ui/Avatar';
import {
  canAccessAppPath,
  cn,
  isAdminRole,
  isInvestorRole,
  isClientRole,
  isMarketerRole,
  isSuperAdminRole,
} from '@/lib/utils';

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },

  /* ------------------------- investor workspace ------------------------- */
  // Shown only to the INVESTOR role. Ordered to follow the money: what they
  // put in, what the company did with it, what it is worth, what they are owed.
  { to: '/app/investor/timeline', label: 'My investments', icon: CalendarClock, investorOnly: true },
  { to: '/app/investor/equity', label: 'Equity progress', icon: PieChart, investorOnly: true },
  { to: '/app/investor/revenue', label: 'Revenue', icon: IndianRupee, investorOnly: true },
  { to: '/app/investor/expenses', label: 'Expenses', icon: Wallet, investorOnly: true },
  { to: '/app/investor/profit', label: 'Profit', icon: TrendingUp, investorOnly: true },
  { to: '/app/investor/valuation', label: 'Valuation', icon: Building2, investorOnly: true },
  { to: '/app/investor/share-value', label: 'Share value', icon: Trophy, investorOnly: true },
  { to: '/app/investor/roi', label: 'ROI', icon: Calculator, investorOnly: true },
  { to: '/app/investor/payments', label: 'Payments', icon: Coins, investorOnly: true },
  { to: '/app/investor/reports', label: 'Reports', icon: BarChart3, investorOnly: true },
  { to: '/app/investor/documents', label: 'Documents', icon: FolderArchive, investorOnly: true },
  { to: '/app/investor/records', label: 'Fund usage', icon: Receipt, investorOnly: true },
  { to: '/app/investor/notifications', label: 'Notifications', icon: Bell, investorOnly: true },
  { to: '/app/investor/profile', label: 'My profile', icon: UserCircle, investorOnly: true },
  { to: '/app/investor/settings', label: 'Settings', icon: Settings, investorOnly: true },

  /* ------------------------ contractor workspace ------------------------ */
  // Shown only to the FREELANCE_PERFORMANCE_MARKETER role. Ordered the way
  // the engagement runs: the work, the paperwork, the money, then help.
  { to: '/app/marketer/tasks', label: 'My tasks', icon: ListChecks, marketerOnly: true },
  { to: '/app/marketer/documents', label: 'Documents', icon: FolderArchive, marketerOnly: true },
  { to: '/app/marketer/payments', label: 'Payments', icon: Coins, marketerOnly: true },
  { to: '/app/marketer/tickets', label: 'Support tickets', icon: LifeBuoy, marketerOnly: true },

  /* --------------------------- client portal ---------------------------- */
  // Shown only to the CLIENT role. Their work, their paperwork, their people.
  { to: '/app/client/projects', label: 'My projects', icon: FolderKanban, clientOnly: true },
  { to: '/app/client/documents', label: 'Documents', icon: FolderArchive, clientOnly: true },
  { to: '/app/tickets', label: 'Support tickets', icon: LifeBuoy, clientOnly: true },
  { to: '/app/client/settings', label: 'Settings', icon: Settings, clientOnly: true },

  /* --------------------------- finance admin ---------------------------- */
  { to: '/app/finance/revenue', label: 'Revenue', icon: IndianRupee, adminOnly: true },
  { to: '/app/finance/expenses', label: 'Expenses', icon: Wallet, adminOnly: true },
  { to: '/app/finance/valuation', label: 'Valuation', icon: Building2, adminOnly: true },
  { to: '/app/finance/distributions', label: 'Distributions', icon: Coins, adminOnly: true },
  { to: '/app/finance/documents', label: 'Investor docs', icon: FolderArchive, adminOnly: true },
  { to: '/app/finance/audit', label: 'Audit trail', icon: History, adminOnly: true },
  { to: '/app/finance/clients', label: 'Clients', icon: Building, superAdminOnly: true },
  { to: '/app/finance/contractor-payments', label: 'Contractor pay', icon: HandCoins, adminOnly: true },
  { to: '/app/marketer/tickets', label: 'Support tickets', icon: LifeBuoy, adminOnly: true },

  { to: '/app/users', label: 'Users', icon: UserCog, adminOnly: true },
  { to: '/app/kyc-review', label: 'KYC Review', icon: BadgeCheck, adminOnly: true },
  { to: '/app/investments', label: 'Investments', icon: Receipt, adminOnly: true },
  { to: '/app/commitments', label: 'Commitments', icon: HandCoins, adminOnly: true },
  { to: '/app/leads', label: 'Leads', icon: Users, staffOnly: true },
  { to: '/app/accounts', label: 'Accounts', icon: Building, staffOnly: true },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban, staffOnly: true },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks, staffOnly: true },
  { to: '/app/contacts', label: 'Contacts', icon: Building2, staffOnly: true },
  { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare, staffOnly: true },
  // Admin-only: authoring publishes straight to the public marketing site.
  { to: '/app/blog', label: 'Blog', icon: FileText, adminOnly: true },
  // Admin-only: subscriber addresses are PII and the send history names them.
  { to: '/app/newsletter', label: 'Newsletter', icon: Mail, adminOnly: true },
  { to: '/app/roles', label: 'Roles', icon: ShieldHalf, superAdminOnly: true },
] as Array<{
  to: string;
  label: string;
  icon: typeof Users;
  end?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  staffOnly?: boolean;
  investorOnly?: boolean;
  marketerOnly?: boolean;
  clientOnly?: boolean;
}>;

const SIDEBAR_KEY = 'esscentra.sidebar.collapsed';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1',
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Gate links by tier: Users/KYC Review = admin+, Roles = super admin only.
  // Investors (read-only stakeholders) only get the KPI overview.
  const isAdmin = isAdminRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isMarketer = isMarketerRole(user?.role);
  const isClient = isClientRole(user?.role);

  /** Clients are known by their company; everyone else by their own name. */
  const displayName = user?.company?.name || user?.name || '';
  const isInvestor = isInvestorRole(user?.role);
  const navItems = NAV.filter((item) => {
    // Narrow-surface roles (see RESTRICTED_ROLE_PATHS) get only the pages
    // listed for them. Checked first so a tier flag can never widen it.
    if (!canAccessAppPath(user?.role, item.to)) return false;
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.marketerOnly) return isMarketer;
    if (item.clientOnly) return isClient;
    if (item.adminOnly) return isAdmin;
    // The investor workspace is theirs alone — an admin inspecting an
    // investor does it from the finance screens, not by borrowing their nav.
    if (item.investorOnly) return isInvestor;
    if (item.staffOnly) return !isInvestor;
    return true;
  });

  const onLogout = async () => {
    await logout();
    toast.info('Signed out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  // Shared link styles. When collapsed (on desktop), labels hide and icons center.
  const linkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
      collapsed && 'lg:justify-center lg:px-0',
      isActive
        ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
    );
  const labelClass = cn('truncate', collapsed && 'lg:hidden');

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-white/10 bg-[#070c1a]/85 backdrop-blur-xl transition-all duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center justify-between px-5',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          {/* Full logo (mobile always; desktop when expanded) */}
          <span className={cn(collapsed && 'lg:hidden')}>
            <Logo />
          </span>
          {/* Icon-only logo (desktop when collapsed) */}
          {collapsed && (
            <span className="hidden lg:block">
              <Logo withWordmark={false} />
            </span>
          )}
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => linkClass(isActive)}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-3">
          <NavLink
            to="/kyc"
            onClick={() => setOpen(false)}
            title={collapsed ? 'Verification' : undefined}
            className={({ isActive }) => linkClass(isActive)}
          >
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
            <span className={labelClass}>Verification</span>
          </NavLink>
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            title={collapsed ? 'Profile' : undefined}
            className={({ isActive }) => linkClass(isActive)}
          >
            <UserCircle className="h-[18px] w-[18px] shrink-0" />
            <span className={labelClass}>Profile</span>
          </NavLink>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main column */}
      <div className={cn('transition-all duration-200', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-[#070c1a]/70 px-4 backdrop-blur-xl sm:px-6">
          {/* Mobile: open drawer */}
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Desktop: collapse / expand sidebar */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:grid"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Invoices & bills live in the header rather than the sidebar:
                they cut across investors, clients and freelancers, so they
                belong to no single section of the nav. */}
            {isAdmin && (
              <NavLink
                to="/app/finance/invoices"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition sm:px-3',
                    isActive
                      ? 'bg-brand-500/15 text-brand-200 ring-1 ring-brand-400/30'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )
                }
                title="Invoices & Bills"
              >
                <ScrollText className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden md:inline">Invoices &amp; Bills</span>
              </NavLink>
            )}
            <NotificationBell />
            <ThemeSwitcher />
            <div className="hidden text-right sm:block">
              {/* A client is dealt with as a company: show the company name,
                  with the person's own name underneath so they still know
                  which login they are on. */}
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-xs text-slate-400">
                {user?.company ? user.name : user?.email}
              </p>
            </div>
            <Avatar
              src={user?.company?.logo ?? user?.avatarUrl}
              name={displayName}
            />
            <button
              onClick={onLogout}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}