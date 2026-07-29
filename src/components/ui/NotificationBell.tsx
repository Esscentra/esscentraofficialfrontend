import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Info,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/lib/notificationApi';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/** Icon + color for a notification type (best-effort, with a neutral fallback). */
function typeVisual(type?: string): { icon: LucideIcon; className: string } {
  switch ((type ?? '').toUpperCase()) {
    case 'SUCCESS':
    case 'APPROVED':
    case 'PAYMENT':
      return { icon: CheckCircle2, className: 'text-emerald-300 bg-emerald-500/15 ring-emerald-500/30' };
    case 'WARNING':
    case 'PENDING':
      return { icon: AlertTriangle, className: 'text-amber-300 bg-amber-500/15 ring-amber-500/30' };
    case 'ERROR':
    case 'REJECTED':
      return { icon: XCircle, className: 'text-rose-300 bg-rose-500/15 ring-rose-500/30' };
    default:
      return { icon: Info, className: 'text-brand-300 bg-brand-500/15 ring-brand-500/30' };
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

const POLL_MS = 60_000;

export function NotificationBell() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unread = items.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    try {
      const data = await listNotifications();
      setItems(data);
    } catch {
      /* silent — the bell shouldn't error the whole shell */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + light polling for the unread badge.
  useEffect(() => {
    load();
    const t = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  // Close on outside-click / Escape.
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

  const toggle = () => {
    setOpen((o) => {
      if (!o) void load(); // refresh when opening
      return !o;
    });
  };

  const onItemClick = async (n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      markNotificationRead(n.id).catch(() => load());
    }
    if (n.link) {
      setOpen(false);
      if (/^https?:\/\//i.test(n.link)) window.open(n.link, '_blank', 'noopener');
      else navigate(n.link);
    }
  };

  const onMarkAll = async () => {
    if (!unread) return;
    setMarkingAll(true);
    const prev = items;
    setItems((p) => p.map((it) => ({ ...it, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(prev);
    } finally {
      setMarkingAll(false);
    }
  };

  const onDelete = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((it) => it.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      setItems(prev);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-lg transition',
          open ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none !text-white ring-2 ring-[#0b1020]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right !rounded-2xl p-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unread > 0 && (
                  <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-200 ring-1 ring-brand-500/25">
                    {unread} new
                  </span>
                )}
              </div>
              <button
                onClick={onMarkAll}
                disabled={!unread || markingAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-300 transition hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[24rem] overflow-y-auto">
              {loading ? (
                <div className="grid place-items-center py-12 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-300" />
                </div>
              ) : items.length === 0 ? (
                <div className="grid place-items-center gap-2 px-6 py-12 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.04] text-slate-400 ring-1 ring-white/10">
                    <BellOff className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-white">You’re all caught up</p>
                  <p className="text-xs text-slate-500">No notifications right now.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((n) => {
                    const v = typeVisual(n.type);
                    const Icon = v.icon;
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          'group relative flex gap-3 px-4 py-3 transition-colors',
                          !n.read && 'bg-brand-500/[0.05]',
                          n.link && 'cursor-pointer hover:bg-white/[0.04]',
                        )}
                        onClick={() => void onItemClick(n)}
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1',
                            v.className,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-sm',
                                n.read ? 'font-medium text-slate-200' : 'font-semibold text-white',
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
                            )}
                          </div>
                          {n.message && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{n.message}</p>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">{timeAgo(n.createdAt)}</span>
                          </div>
                        </div>

                        {/* Per-item actions */}
                        <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {!n.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItems((prev) =>
                                  prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)),
                                );
                                markNotificationRead(n.id).catch(() => load());
                              }}
                              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDelete(n.id);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                            title="Delete"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
