import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Orbit } from 'lucide-react';
import {
  ECOSYSTEM_CHANGED_EVENT,
  getEcosystemOverview,
  type EcosystemPlatformRow,
  type PlatformStatus,
} from '@/lib/ecosystemApi';
import { cn } from '@/lib/utils';
import { PlatformLogo } from './PlatformLogo';

const STATUS_DOT: Record<PlatformStatus, string> = {
  ACTIVE: 'bg-emerald-400',
  BETA: 'bg-sky-400',
  PAUSED: 'bg-amber-400',
  SUNSET: 'bg-slate-500',
};

/**
 * The sidebar inside the Ecosystem hub: the hub overview, then one entry per
 * child platform. Refreshes itself when a platform is added, renamed or
 * removed (ECOSYSTEM_CHANGED_EVENT).
 */
export function EcosystemNav({
  collapsed,
  linkClass,
  onNavigate,
}: {
  collapsed: boolean;
  linkClass: (isActive: boolean) => string;
  onNavigate: () => void;
}) {
  const [platforms, setPlatforms] = useState<EcosystemPlatformRow[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      getEcosystemOverview()
        .then((overview) => active && setPlatforms(overview.platforms))
        .catch(() => active && setPlatforms((prev) => prev ?? []));
    void load();
    window.addEventListener(ECOSYSTEM_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(ECOSYSTEM_CHANGED_EVENT, load);
    };
  }, []);

  return (
    <>
      <NavLink
        to="/app/ecosystem"
        end
        onClick={onNavigate}
        title={collapsed ? 'Ecosystem overview' : undefined}
        className={({ isActive }) => linkClass(isActive)}
      >
        <Orbit className="h-[18px] w-[18px] shrink-0" />
        <span className={cn('truncate', collapsed && 'lg:hidden')}>Overview</span>
      </NavLink>

      <p
        className={cn(
          'mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500',
          collapsed && 'lg:hidden',
        )}
      >
        Sub-products
      </p>

      {platforms === null &&
        [0, 1].map((key) => (
          <div key={key} className="mx-3 my-1.5 h-8 animate-pulse rounded-lg bg-white/[0.05]" />
        ))}

      {platforms?.length === 0 && (
        <p className={cn('px-3 text-xs text-slate-500', collapsed && 'lg:hidden')}>
          No sub-products yet.
        </p>
      )}

      {platforms?.map((platform) => (
        <NavLink
          key={platform.id}
          to={`/app/ecosystem/${platform.slug}`}
          onClick={onNavigate}
          title={collapsed ? platform.name : undefined}
          className={({ isActive }) => linkClass(isActive)}
        >
          <span className="relative shrink-0" aria-hidden>
            <PlatformLogo
              slug={platform.slug}
              name={platform.name}
              className="h-[22px] w-[22px] rounded-md"
              letterClassName="text-[11px]"
            />
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-[#070c1a]',
                STATUS_DOT[platform.status],
              )}
            />
          </span>
          <span className={cn('min-w-0 flex-1 truncate', collapsed && 'lg:hidden')}>
            {platform.name}
          </span>
          {platform.live && (
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                platform.live.needsReconnect
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300',
                collapsed && 'lg:hidden',
              )}
              title={platform.live.needsReconnect ? 'Live data needs reconnecting' : 'Live data connected'}
            >
              {platform.live.needsReconnect ? '!' : 'Live'}
            </span>
          )}
        </NavLink>
      ))}
    </>
  );
}
