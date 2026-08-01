import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CalendarClock, Check, Trash2 } from 'lucide-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  type AppNotification,
} from '@/lib/notificationApi';
import { cn } from '@/lib/utils';

const POLL_MS = 60_000;

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listNotifications());
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;

  const onRead = async (n: AppNotification) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
    try {
      await markNotificationRead(n.id);
    } catch {
      void load();
    }
  };

  const onReadAll = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      void load();
    }
  };

  const onDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      void load();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-normal leading-none !text-white ring-2 badge-ring">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-card absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] !rounded-2xl p-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => void onReadAll()}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-300 transition hover:text-brand-200"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => void onRead(n)}
                    className={cn(
                      'group flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-white/[0.04]',
                      !n.isRead && 'bg-brand-500/[0.06]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1',
                        n.type === 'INVESTMENT_DUE'
                          ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                          : 'bg-white/[0.04] text-slate-400 ring-white/10',
                      )}
                    >
                      {n.type === 'INVESTMENT_DUE' ? (
                        <CalendarClock className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="truncate">{n.title}</span>
                        {!n.isRead && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        )}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{n.message}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDelete(n.id);
                      }}
                      className="grid h-7 w-7 shrink-0 place-items-center self-start rounded-lg text-slate-600 opacity-0 transition hover:bg-white/10 hover:text-rose-300 group-hover:opacity-100"
                      aria-label="Remove notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}