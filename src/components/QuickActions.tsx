import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, FolderArchive, Github, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 *  QUICK ACTIONS — the super admin's floating attachment-style menu
 * ============================================================================
 *
 * A WhatsApp-attachment-style popover pinned to the bottom-right of the
 * workspace: a round "+" button that flips open a dark menu of shortcuts.
 * These pages were moved OUT of the sidebar to keep it lean; this is their
 * home now. Rendered for super admins only (see DashboardLayout).
 * ============================================================================
 */

const ACTIONS = [
  {
    label: 'Blogs',
    to: '/app/blog',
    icon: FileText,
    chip: 'bg-violet-500/25 text-violet-300',
  },
  {
    label: 'GitHub',
    to: '/app/github',
    icon: Github,
    chip: 'bg-slate-500/30 text-slate-100',
  },
  {
    label: 'My documents',
    to: '/app/finance/documents',
    icon: FolderArchive,
    chip: 'bg-sky-500/25 text-sky-300',
  },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Invisible backdrop: any outside click closes the menu. */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="glass-card mb-3 w-56 overflow-hidden rounded-2xl py-2 shadow-2xl"
            >
              {ACTIONS.map((action) => (
                <NavLink
                  key={action.to}
                  to={action.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-white/[0.06] text-white'
                        : 'text-slate-200 hover:bg-white/[0.06] hover:text-white',
                    )
                  }
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                      action.chip,
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                  </span>
                  {action.label}
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={open}
          className="grid h-[3.25rem] w-[3.25rem] place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 !text-white shadow-lg shadow-brand-900/40 ring-1 ring-white/15 transition hover:brightness-110"
        >
          <Plus
            className={cn(
              'h-5 w-5 transition-transform duration-200',
              open && 'rotate-45',
            )}
          />
        </button>
      </div>
    </>
  );
}
