import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellOff,
  Building2,
  CheckCheck,
  FileText,
  HandCoins,
  Info,
  ScrollText,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/finance/Controls';
import { ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationType,
} from '@/lib/notificationApi';
import { useInvestorData } from './useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDateTime, relativeTime } from '@/lib/format';

/**
 * ============================================================================
 *  13. NOTIFICATIONS
 * ============================================================================
 *
 * The full history behind the bell in the top bar. The bell shows the latest
 * few; this page is where an investor goes to find "that message about the
 * valuation" from three weeks ago.
 *
 * Each notification type gets its own icon and destination, so a profit credit
 * links to the payment history and a valuation update links to the valuation
 * page — a notification that cannot be acted on is just noise.
 * ============================================================================
 */

interface TypeMeta {
  icon: LucideIcon;
  tone: 'green' | 'blue' | 'violet' | 'amber' | 'teal' | 'gray';
  link?: string;
}

const TYPE_META: Partial<Record<NotificationType, TypeMeta>> = {
  INVESTMENT_RECEIVED: { icon: Wallet, tone: 'blue', link: '/app/investor/timeline' },
  PROFIT_CREDITED: { icon: HandCoins, tone: 'green', link: '/app/investor/payments' },
  VALUATION_UPDATED: { icon: Building2, tone: 'violet', link: '/app/investor/valuation' },
  REVENUE_MILESTONE: { icon: TrendingUp, tone: 'teal', link: '/app/investor/revenue' },
  AGREEMENT_UPDATED: { icon: ScrollText, tone: 'amber', link: '/app/investor/documents' },
  DOCUMENT_UPLOADED: { icon: FileText, tone: 'blue', link: '/app/investor/documents' },
  INVESTMENT_DUE: { icon: Wallet, tone: 'amber', link: '/app/investor/timeline' },
  KYC_APPROVED: { icon: CheckCheck, tone: 'green', link: '/kyc' },
  KYC_REJECTED: { icon: Info, tone: 'amber', link: '/kyc' },
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'finance', label: 'Investment' },
] as const;

const FINANCE_TYPES = new Set<NotificationType>([
  'INVESTMENT_RECEIVED',
  'PROFIT_CREDITED',
  'VALUATION_UPDATED',
  'REVENUE_MILESTONE',
  'AGREEMENT_UPDATED',
  'DOCUMENT_UPLOADED',
  'INVESTMENT_DUE',
]);

export default function InvestorNotifications() {
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useInvestorData<AppNotification[]>(
    () => listNotifications(),
    [],
  );

  const notifications = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => !item.isRead);
    if (filter === 'finance') return notifications.filter((item) => FINANCE_TYPES.has(item.type));
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const markAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      toast.success('All caught up', 'Every notification is marked as read.');
      reload();
    } catch (thrown) {
      toast.error('Could not update', getErrorMessage(thrown));
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      reload();
    } catch {
      // A failed read-marker is not worth interrupting the user for; the item
      // simply stays unread and will be retried next time it is opened.
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteNotification(id);
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        subtitle="Investment receipts, profit credits, valuation changes and new documents."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => void markAll()} loading={busy}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === option.value
                ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/35'
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {option.label}
            {option.value === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 tabular-nums text-brand-300">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <InfoNote tone="neutral" icon={BellOff}>
          {filter === 'unread'
            ? 'Nothing unread — you are all caught up.'
            : 'No notifications yet. Investment receipts, profit credits and valuation updates will land here.'}
        </InfoNote>
      ) : (
        <ul className="space-y-2">
          {visible.map((notification) => {
            const meta = TYPE_META[notification.type];
            const Icon = meta?.icon ?? Info;
            const href = notification.link ?? meta?.link;

            const body = (
              <div
                className={`glass-card flex items-start gap-4 p-4 transition-colors ${
                  href ? 'card-lift cursor-pointer' : ''
                } ${notification.isRead ? '' : 'ring-1 ring-brand-500/20'}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm ${
                        notification.isRead ? 'font-medium text-slate-300' : 'font-semibold text-white'
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.isRead && <Pill tone={meta?.tone ?? 'blue'}>New</Pill>}
                  </div>

                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {notification.message}
                  </p>

                  <p
                    className="mt-1.5 text-xs text-slate-500"
                    title={formatDateTime(notification.createdAt)}
                  >
                    {relativeTime(notification.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    // Stop the click from also following the row's link.
                    event.preventDefault();
                    event.stopPropagation();
                    void remove(notification.id);
                  }}
                  className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );

            return (
              <li key={notification.id}>
                {href ? (
                  <Link
                    to={href}
                    onClick={() => {
                      if (!notification.isRead) void markOne(notification.id);
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    onClick={() => {
                      if (!notification.isRead) void markOne(notification.id);
                    }}
                  >
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
