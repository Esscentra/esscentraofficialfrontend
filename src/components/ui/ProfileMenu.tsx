import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Check, ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './Toast';
import { useTheme, type Theme } from '@/context/ThemeProvider';
import { cn, initials } from '@/lib/utils';

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'reading', label: 'Reading', icon: BookOpen },
];

/** Topbar account control: avatar trigger + dropdown with identity, theme and sign-out. */
export function ProfileMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onLogout = async () => {
    setOpen(false);
    await logout();
    toast.info('Signed out', 'See you soon.');
    navigate('/login', { replace: true });
  };

  const Avatar = ({ size = 'h-9 w-9' }: { size?: string }) => (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold !text-white ring-1 ring-white/20',
        size,
      )}
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        initials(user?.name ?? '')
      )}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          'flex items-center gap-2.5 rounded-xl border py-1.5 pl-2 pr-2.5 transition',
          open
            ? 'border-white/20 bg-white/[0.08]'
            : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]',
        )}
      >
        <Avatar />
        <div className="hidden text-left sm:block">
          <p className="max-w-[12rem] truncate text-sm font-semibold leading-tight text-white">
            {user?.name}
          </p>
          <p className="max-w-[12rem] truncate text-[11px] leading-tight text-slate-400">
            {user?.email}
          </p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card absolute right-0 top-full z-50 mt-2 w-64 origin-top-right !rounded-2xl p-0"
          >
            {/* Identity header */}
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Avatar size="h-11 w-11" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
                {user?.role && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold capitalize text-brand-200 ring-1 ring-brand-500/25">
                    {user.role.toLowerCase().replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Appearance */}
            <div className="p-2">
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Appearance
              </p>
              {THEMES.map(({ value, label, icon: Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition',
                      active
                        ? 'bg-brand-500/15 font-semibold text-brand-200'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Sign out */}
            <div className="border-t border-white/10 p-2">
              <button
                onClick={onLogout}
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-300"
              >
                <LogOut className="h-[17px] w-[17px] shrink-0" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
