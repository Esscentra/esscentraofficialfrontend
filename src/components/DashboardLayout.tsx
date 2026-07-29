import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Building,
  Building2,
  FileText,
  FolderKanban,
  HandCoins,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ShieldHalf,
  UserCircle,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AuroraBackground } from './AuroraBackground';
import { Logo } from './Logo';
import { ProfileMenu } from './ui/ProfileMenu';
import { NotificationBell } from './ui/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './ui/Toast';
import { cn, initials, isAdminRole, isInvestorRole, isSuperAdminRole } from '@/lib/utils';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Users;
  end?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  staffOnly?: boolean;
};

type NavSection = { title: string | null; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    title: null,
    items: [{ to: '/app', label: 'Overview', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'CRM',
    items: [
      { to: '/app/leads', label: 'Leads', icon: Users, staffOnly: true },
      { to: '/app/accounts', label: 'Accounts', icon: Building, staffOnly: true },
      { to: '/app/projects', label: 'Projects', icon: FolderKanban, staffOnly: true },
      { to: '/app/tasks', label: 'Tasks', icon: ListChecks, staffOnly: true },
      { to: '/app/contacts', label: 'Contacts', icon: Building2, staffOnly: true },
      { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare, staffOnly: true },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/app/blog', label: 'Blog', icon: FileText, staffOnly: true },
      { to: '/app/newsletter', label: 'Newsletter', icon: Mail, staffOnly: true },
    ],
  },
  {
    title: 'Governance',
    items: [
      { to: '/app/users', label: 'Users', icon: UserCog, adminOnly: true },
      { to: '/app/kyc-review', label: 'KYC Review', icon: BadgeCheck, adminOnly: true },
      { to: '/app/investments', label: 'Investments', icon: IndianRupee, adminOnly: true },
      { to: '/app/commitments', label: 'Commitments', icon: HandCoins, adminOnly: true },
      { to: '/app/roles', label: 'Roles', icon: ShieldHalf, superAdminOnly: true },
    ],
  },
];

const SIDEBAR_KEY = 'esscentra.sidebar.collapsed';

// Map a workspace path to its human label for the browser tab title.
const PATH_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.items).map((it) => [it.to, it.label]),
);

/** URL-friendly slug of a display name, e.g. "Aria Sharma" → "aria-sharma". */
function slugifyName(name?: string): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1',
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Keep the browser tab title in sync: "<name> — Dashboard" on the overview,
  // "<name> — <Section>" on inner pages.
  useEffect(() => {
    const path = location.pathname;
    const label = path === '/app' || path === '/app/' ? 'Dashboard' : PATH_LABELS[path] ?? 'Dashboard';
    document.title = user?.name ? `${user.name} — ${label}` : `${label} · Esscentra`;
  }, [location.pathname, user?.name]);

  const profileTo = user?.name ? `/profile/${slugifyName(user.name)}` : '/profile';

  // Toggle the sidebar with Ctrl+/ (Windows/Linux) or ⌘+/ (macOS).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key === '/') {
        e.preventDefault();
        // On desktop toggle the collapse; on mobile toggle the drawer.
        if (window.matchMedia('(min-width: 1024px)').matches) {
          setCollapsed((c) => !c);
        } else {
          setOpen((o) => !o);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Gate links by tier: Users/KYC Review = admin+, Roles = super admin only.
  // Investors (read-only stakeholders) only get the KPI overview.
  const isAdmin = isAdminRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isInvestor = isInvestorRole(user?.role);
  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((item) => {
      if (item.superAdminOnly) return isSuperAdmin;
      if (item.adminOnly) return isAdmin;
      if (item.staffOnly) return !isInvestor;
      return true;
    }),
  })).filter((s) => s.items.length > 0);

  const onLogout = async () => {
    await logout();
    toast.info('Signed out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  // Shared link styles. When collapsed (on desktop), labels hide and icons center.
  const linkClass = (isActive: boolean) =>
    cn(
      'nav-item',
      collapsed && 'lg:justify-center lg:px-0',
      isActive ? 'nav-active' : 'nav-idle',
    );
  const labelClass = cn('truncate', collapsed && 'lg:hidden');

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {/* Sidebar */}
      <aside
        className={cn(
          'app-bar fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-white/[0.07] transition-all duration-200 lg:translate-x-0',
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

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
          {sections.map((section, si) => (
            <div key={section.title ?? si} className="flex flex-col gap-1">
              {section.title && (
                <p className={cn('nav-section', collapsed && 'lg:hidden')}>{section.title}</p>
              )}
              {section.title && collapsed && (
                <div className="my-2 hidden h-px bg-white/[0.07] lg:block" aria-hidden />
              )}
              {section.items.map((item) => (
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
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/[0.07] px-3 py-3">
          <p className={cn('nav-section !pt-1', collapsed && 'lg:hidden')}>Account</p>
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
            to={profileTo}
            onClick={() => setOpen(false)}
            title={collapsed ? 'Profile' : undefined}
            className={({ isActive }) => linkClass(isActive)}
          >
            <UserCircle className="h-[18px] w-[18px] shrink-0" />
            <span className={labelClass}>Profile</span>
          </NavLink>

          {/* Signed-in user card */}
          <div
            className={cn(
              'mt-2 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5',
              collapsed && 'lg:justify-center lg:border-0 lg:bg-transparent lg:p-0',
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold !text-white ring-1 ring-white/20">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initials(user?.name ?? '')
              )}
            </div>
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={onLogout}
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300',
                collapsed && 'lg:hidden',
              )}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main column */}
      <div className={cn('transition-all duration-200', collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-64')}>
        <header className="app-bar sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/[0.06] px-4 sm:px-6">
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
            aria-keyshortcuts="Control+/ Meta+/"
            title={`${collapsed ? 'Expand' : 'Collapse'} sidebar  (Ctrl / ⌘ + /)`}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          {/* Contextual greeting */}
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold text-white">
              {greeting()}, {user?.firstName ?? user?.name?.split(' ')[0] ?? 'there'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{today}</p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        <main key={location.pathname} className="page-enter mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
