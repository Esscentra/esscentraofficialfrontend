import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building,
  Building2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  ShieldCheck,
  ShieldHalf,
  Target,
  UserCircle,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { BadgeCheck } from 'lucide-react';
import { AuroraBackground } from './AuroraBackground';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ui/ThemeSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './ui/Toast';
import { initials, isAdminRole } from '@/lib/utils';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/users', label: 'Users', icon: UserCog, adminOnly: true },
  { to: '/app/kyc-review', label: 'KYC Review', icon: BadgeCheck, adminOnly: true },
  { to: '/app/leads', label: 'Leads', icon: Users },
  { to: '/app/opportunities', label: 'Opportunities', icon: Target },
  { to: '/app/accounts', label: 'Accounts', icon: Building },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/app/contacts', label: 'Contacts', icon: Building2 },
  { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/app/blog', label: 'Blog', icon: FileText },
  { to: '/app/newsletter', label: 'Newsletter', icon: Mail },
  { to: '/app/roles', label: 'Roles', icon: ShieldHalf, adminOnly: true },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Only admins see admin-only links (Users, Roles, KYC Review).
  const isAdmin = isAdminRole(user?.role);
  const navItems = NAV.filter((item) => !item.adminOnly || isAdmin);

  const onLogout = async () => {
    await logout();
    toast.info('Signed out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-white/10 bg-[#070c1a]/85 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Logo />
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
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 text-white shadow'
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-3">
          <NavLink
            to="/kyc"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <ShieldCheck className="h-[18px] w-[18px]" /> Verification
          </NavLink>
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <UserCircle className="h-[18px] w-[18px]" /> Profile
          </NavLink>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-[#070c1a]/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
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
