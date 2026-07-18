import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  CreditCard,
  ExternalLink,
  Globe,
  LifeBuoy,
  LineChart,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

type Platform = { id: string; label: string; host: string; env: 'prod' | 'dev' };

const PLATFORMS: Platform[] = [
  { id: 'prep', label: 'Production', host: 'prep.esscentra.in', env: 'prod' },
  { id: 'devprep', label: 'Development', host: 'devprep.esscentra.in', env: 'dev' },
];

type Module = { label: string; desc: string; icon: LucideIcon; path: string };

// NOTE: paths are sensible defaults — adjust to match each platform's routes.
const MODULES: Module[] = [
  { label: 'User Management', desc: 'Accounts, roles & access control', icon: UserCog, path: 'admin/users' },
  { label: 'Revenue Analytics', desc: 'Revenue, MRR & growth trends', icon: LineChart, path: 'admin/revenue' },
  { label: 'Subscription Management', desc: 'Plans, billing & renewals', icon: CreditCard, path: 'admin/subscriptions' },
  { label: 'Support Tickets', desc: 'Customer queue & SLA tracking', icon: LifeBuoy, path: 'admin/support' },
  { label: 'Notifications', desc: 'Broadcasts & system alerts', icon: Bell, path: 'admin/notifications' },
  { label: 'Cross-platform Reports', desc: 'Unified reporting across platforms', icon: BarChart3, path: 'admin/reports' },
  { label: 'Activity Logs', desc: 'Audit trail of users & events', icon: Activity, path: 'admin/activity-logs' },
];

/** Admin-only launcher for the connected Esscentra platforms and their modules. */
export function ConnectedPlatforms() {
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]);
  const base = `https://${platform.host}`;

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300/90">
            <span className="h-px w-6 bg-gradient-to-r from-brand-400 to-transparent" aria-hidden />
            Connected platforms
          </p>
          <h2 className="font-display text-xl font-bold tracking-tight text-white">
            Platform administration
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Manage Esscentra across its connected platforms. Modules open on the selected platform.
          </p>
        </div>

        {/* Platform switcher */}
        <div
          role="radiogroup"
          aria-label="Platform"
          className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-0.5"
        >
          {PLATFORMS.map((p) => {
            const active = p.id === platform.id;
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={active}
                onClick={() => setPlatform(p)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-gradient-to-b from-brand-500 to-brand-600 !text-white shadow ring-1 ring-inset ring-white/20'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active platform bar */}
      <div className="glass-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
            <Globe className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-semibold text-white">
              {platform.host}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                  platform.env === 'prod'
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                }`}
              >
                {platform.label}
              </span>
            </p>
            <p className="truncate text-xs text-slate-500">Active platform — modules open here</p>
          </div>
        </div>
        <a
          href={base}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open platform
        </a>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <a
            key={m.label}
            href={`${base}/${m.path}`}
            target="_blank"
            rel="noreferrer"
            className="glass-card card-lift group flex items-start gap-4 p-5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30 transition-colors duration-200 group-hover:from-brand-400/40 group-hover:to-brand-700/20 group-hover:text-brand-200">
              <m.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 font-semibold text-white">
                {m.label}
                <ExternalLink
                  className="h-3.5 w-3.5 -translate-x-1 text-brand-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden
                />
              </h3>
              <p className="mt-0.5 text-sm text-slate-400">{m.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
