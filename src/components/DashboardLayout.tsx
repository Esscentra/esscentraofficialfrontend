import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Menu, Orbit, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { DashboardSkeleton } from './DashboardSkeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { EcosystemNav } from './EcosystemNav';
import { AuroraBackground } from './AuroraBackground';
import { NotificationBell } from './NotificationBell';
import { Logo } from './Logo';
import { ProfileMenu } from './ui/ProfileMenu';
import { SectionTabs } from './SectionTabs';
import { isItemActive, sectionsFor, tabsFor } from './navigation';
import { useAuth } from '@/context/AuthContext';
import { cn, isInvestorRole, isSuperAdminRole } from '@/lib/utils';

const SIDEBAR_KEY = 'esscentra.sidebar.collapsed';
const SECTIONS_KEY = 'esscentra.sidebar.closedSections';

function readClosedSections(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function DashboardLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1',
  );
  // Sidebar sections the user folded away, remembered between visits.
  const [closedSections, setClosedSections] = useState<string[]>(readClosedSections);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(closedSections));
  }, [closedSections]);

  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isInvestor = isInvestorRole(user?.role);

  // ------------------------------------------------------------------
  // Ecosystem hub mode — the Instagram-style account switch. Inside
  // /app/ecosystem the parent platform's nav disappears entirely; the
  // header swaps its "Ecosystem" button for an "Esscentra" one to switch
  // back. Direct URL access by other roles is still stopped by
  // EcosystemRoute — this is presentation, not enforcement.
  // ------------------------------------------------------------------
  const hubMode = pathname.startsWith('/app/ecosystem');

  const sections = useMemo(() => (hubMode ? [] : sectionsFor(user?.role)), [hubMode, user?.role]);
  const tabs = hubMode ? null : tabsFor(pathname);

  const toggleSection = (id: string) =>
    setClosedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  // Shared link styles. When collapsed (on desktop), labels hide and icons center.
  const linkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
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

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-2">
          {hubMode && (
            <EcosystemNav
              collapsed={collapsed}
              linkClass={linkClass}
              onNavigate={() => setOpen(false)}
            />
          )}

          {sections.map((section, index) => {
            const hasActive = section.items.some((item) => isItemActive(item, pathname));
            // The section holding the current page never folds away, and the
            // icon-only sidebar always shows every icon.
            const folded =
              !!section.label && !collapsed && closedSections.includes(section.id) && !hasActive;
            return (
              <div key={section.id} className={cn(index > 0 && 'mt-3')}>
                {section.label && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={!folded}
                      className={cn(
                        'group mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-300',
                        collapsed && 'lg:hidden',
                      )}
                    >
                      {section.label}
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition',
                          folded ? '-rotate-90' : 'opacity-0 group-hover:opacity-100',
                        )}
                      />
                    </button>
                    {/* Icon-only sidebar: a thin rule stands in for the heading. */}
                    {collapsed && (
                      <div className="mx-3 mb-2 hidden border-t border-white/10 lg:block" />
                    )}
                  </>
                )}
                {!folded && (
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => {
                      const active = isItemActive(item, pathname);
                      return (
                        <Link
                          key={item.to + item.label}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          title={collapsed ? item.label : undefined}
                          aria-current={active ? 'page' : undefined}
                          className={linkClass(active)}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className={labelClass}>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
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
            {/* The platform switcher. Esscentra ⇄ Ecosystem hub, the same
                way Instagram flips between a personal account and the
                professional dashboard. Founders and the investor only. */}
            {(isSuperAdmin || isInvestor) && (
              <button
                type="button"
                onClick={() => navigate(hubMode ? '/app' : '/app/ecosystem')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition sm:px-3',
                  hubMode
                    ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
                title={hubMode ? 'Back to Esscentra' : 'Switch to the Ecosystem hub'}
              >
                {hubMode ? (
                  <Building2 className="h-[18px] w-[18px] shrink-0" />
                ) : (
                  <Orbit className="h-[18px] w-[18px] shrink-0" />
                )}
                <span className="hidden md:inline">
                  {hubMode ? 'Esscentra' : 'Ecosystem'}
                </span>
              </button>
            )}
            <NotificationBell />
            {/* Profile, verification, settings, theme and sign-out. */}
            <ProfileMenu />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          {tabs && <SectionTabs tabs={tabs} />}
          {/* Inside the shell, so opening a page keeps the sidebar on screen.
              The key clears a crashed page once the user navigates away. */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<DashboardSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
