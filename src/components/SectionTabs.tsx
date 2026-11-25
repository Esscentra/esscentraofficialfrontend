import { NavLink } from 'react-router-dom';
import type { SectionTab } from './navigation';
import { cn } from '@/lib/utils';

/**
 * Tab bar for a group of related pages that share one sidebar entry
 * (e.g. the investor's Revenue / Expenses / Profit / Reports). Each tab is a
 * real route, so the back button and bookmarks behave as before.
 */
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  return (
    <nav
      aria-label="Section"
      className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-white/10 px-1"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
              isActive
                ? 'border-brand-400 text-white'
                : 'border-transparent text-slate-400 hover:border-white/20 hover:text-white',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
