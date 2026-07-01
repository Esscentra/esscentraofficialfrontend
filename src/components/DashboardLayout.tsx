import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Building,
  Building2,
  FileText,
  FolderKanban,
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
import { ThemeSwitcher } from './ui/ThemeSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './ui/Toast';
import { cn, initials, isAdminRole, isSuperAdminRole } from '@/lib/utils';

const NAV = [
  { to: '/app/users', label: 'Users', icon: UserCog, adminOnly: true },
  { to: '/app/kyc-review', label: 'KYC Review', icon: BadgeCheck, adminOnly: true },
  { to: '/app/leads', label: 'Leads', icon: Users },
  { to: '/app/accounts', label: 'Accounts', icon: Building },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/app/contacts', label: 'Contacts', icon: Building2 },
  { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/app/blog', label: 'Blog', icon: FileText },
  { to: '/app/newsletter', label: 'Newsletter', icon: Mail },
  { to: '/app/roles', label: 'Roles', icon: ShieldHalf, superAdminOnly: true },
];

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
  const isAdmin = isAdminRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const navItems = NAV.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin;
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
        ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 text-white shadow'
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

          <div className="ml-auto flex items-center gap-3">
            <ThemeSwitcher />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white ring-1 ring-white/20">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initials(user?.name ?? '')
              )}
            </div>
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
