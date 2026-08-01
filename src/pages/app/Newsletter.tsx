import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Eye,
  Mail,
  MailCheck,
  Pause,
  Play,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import {
  deleteSubscriber,
  getSettings,
  listCampaigns,
  listSubscribers,
  previewCampaign,
  sendCampaign,
  updateSettings,
} from '@/lib/newsletterApi';
import { cn, getErrorMessage } from '@/lib/utils';
import type {
  CampaignStatus,
  NewsletterCampaign,
  NewsletterPreview,
  NewsletterStats,
  NewsletterSubscriber,
} from '@/types';

const CAMPAIGN_TONE: Record<CampaignStatus, Tone> = {
  SENDING: 'sky',
  COMPLETED: 'green',
  SKIPPED: 'amber',
  FAILED: 'red',
};

type Tab = 'subscribers' | 'campaigns';

const dateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

/**
 * Newsletter administration.
 *
 * Admin-only: the subscriber list is PII and the campaign history records
 * exactly who was mailed and when.
 */
export default function NewsletterPage() {
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('subscribers');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats>({
    active: 0,
    unsubscribed: 0,
    total: 0,
  });
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [preview, setPreview] = useState<NewsletterPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listSubscribers(), listCampaigns(), getSettings()])
      .then(([list, history, settings]) => {
        setSubscribers(list.subscribers);
        setStats(list.stats);
        setCampaigns(history);
        setIsPaused(!!settings.isPaused);
      })
      .catch((e) => toast.error('Could not load the newsletter', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  const togglePause = async () => {
    const next = !isPaused;
    setIsPaused(next); // optimistic
    try {
      await updateSettings({ isPaused: next });
      toast.info(
        next ? 'Automatic sending paused' : 'Automatic sending resumed',
        next
          ? 'Tuesday and Wednesday sends will be skipped until you resume.'
          : 'The next send runs on the coming Tuesday or Wednesday.',
      );
    } catch (e) {
      setIsPaused(!next); // rollback
      toast.error('Could not update', getErrorMessage(e, 'Please try again.'));
    }
  };

  const onPreview = async () => {
    setBusy(true);
    try {
      const result = await previewCampaign();
      setPreview(result);
      setPreviewOpen(true);
    } catch (e) {
      toast.error('Nothing to preview', getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSendNow = async () => {
    if (
      !window.confirm(
        `Send a newsletter to ${stats.active} subscriber${stats.active === 1 ? '' : 's'} now?\n\n` +
          `A random published post is picked, skipping any already sent this cycle.`,
      )
    )
      return;

    setBusy(true);
    try {
      const campaign = await sendCampaign(preview?.blogId);
      toast.success(
        campaign.status === 'COMPLETED' ? 'Newsletter sent' : 'Send finished',
        campaign.status === 'SKIPPED'
          ? campaign.reason
          : `${campaign.sentCount} delivered, ${campaign.failedCount} failed`,
      );
      setPreviewOpen(false);
      setPreview(null);
      load();
    } catch (e) {
      toast.error('Send failed', getErrorMessage(e, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const removeSubscriber = async (subscriber: NewsletterSubscriber) => {
    if (!window.confirm(`Delete ${subscriber.email}? This cannot be undone.`)) return;

    const prev = subscribers;
    setSubscribers((s) => s.filter((it) => it.id !== subscriber.id)); // optimistic
    try {
      await deleteSubscriber(subscriber.id);
      toast.info('Subscriber deleted', subscriber.email);
    } catch (e) {
      setSubscribers(prev);
      toast.error('Delete failed', getErrorMessage(e, 'Please try again.'));
    }
  };

  const subscriberColumns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (s) => <span className="font-medium text-white">{s.email}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) =>
        s.isSubscribed ? (
          <StatusBadge tone="green">subscribed</StatusBadge>
        ) : (
          <StatusBadge tone="gray">unsubscribed</StatusBadge>
        ),
    },
    { key: 'subscribedAt', header: 'Joined', render: (s) => day(s.subscribedAt) },
    {
      key: 'lastSentAt',
      header: 'Last email',
      render: (s) => (s.lastSentAt ? day(s.lastSentAt) : '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className="flex justify-end">
          <RowButton
            onClick={() => removeSubscriber(s)}
            aria-label="Delete"
            title="Delete"
            danger
          >
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  const campaignColumns: Column<NewsletterCampaign>[] = [
    {
      key: 'post',
      header: 'Post',
      render: (c) => (
        <div className="min-w-0">
          <span className="font-medium text-white">{c.blogTitle ?? c.subject}</span>
          <p className="truncate text-xs text-slate-500">
            {c.source === 'MANUAL'
              ? `Sent by ${c.triggeredByName ?? 'an admin'}`
              : 'Scheduled'}
            {c.reason && ` · ${c.reason}`}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <StatusBadge tone={CAMPAIGN_TONE[c.status]}>{humanize(c.status)}</StatusBadge>
      ),
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (c) =>
        c.recipientCount ? (
          <span className="text-sm tabular-nums text-slate-300">
            {c.sentCount}/{c.recipientCount}
            {c.failedCount > 0 && (
              <span className="text-rose-300"> · {c.failedCount} failed</span>
            )}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'when', header: 'When', render: (c) => dateTime(c.createdAt) },
  ];

  if (loading) return <LoadingCard label="Loading newsletter…" />;

  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle="One random published post goes out every Tuesday and Wednesday."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={togglePause}>
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" /> Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              )}
            </Button>
            <Button size="sm" variant="secondary" onClick={onPreview} disabled={busy}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button size="sm" onClick={onSendNow} disabled={busy || stats.active === 0}>
              <Send className="h-4 w-4" /> {busy ? 'Working…' : 'Send now'}
            </Button>
          </div>
        }
      />

      {isPaused && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-3">
          <Pause className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-sm text-amber-200">
            Automatic sending is paused. Tuesday and Wednesday runs are recorded as
            skipped until you resume.
          </p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active subscribers" value={stats.active} tone="green" />
        <StatCard
          icon={Mail}
          label="Unsubscribed"
          value={stats.unsubscribed}
          tone="amber"
          hint={`${stats.total} total addresses`}
        />
        <StatCard
          icon={MailCheck}
          label="Campaigns sent"
          value={campaigns.filter((c) => c.status === 'COMPLETED').length}
          tone="sky"
        />
        <StatCard
          icon={CalendarClock}
          label="Schedule"
          value={isPaused ? 'Paused' : 'Tue & Wed'}
          tone={isPaused ? 'amber' : 'brand'}
          hint={isPaused ? 'Resume to restart' : '10:00 IST'}
        />
      </div>

      {/* --------------------------------- tabs --------------------------------- */}
      <div className="mb-4 flex gap-1">
        {(
          [
            { key: 'subscribers', label: `Subscribers (${stats.total})` },
            { key: 'campaigns', label: `History (${campaigns.length})` },
          ] as Array<{ key: Tab; label: string }>
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              tab === t.key
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'subscribers' ? (
        subscribers.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No subscribers yet"
            description="Addresses appear here as people subscribe from the marketing site."
          />
        ) : (
          <DataTable columns={subscriberColumns} rows={subscribers} />
        )
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nothing sent yet"
          description="The first newsletter goes out on the next Tuesday or Wednesday — or press Send now to try it."
        />
      ) : (
        <DataTable columns={campaignColumns} rows={campaigns} />
      )}

      {/* ------------------------------- preview -------------------------------- */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Newsletter preview"
      >
        {preview && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
              <p className="text-slate-400">
                Subject: <span className="text-white">{preview.subject}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Goes to {preview.recipientCount} subscriber
                {preview.recipientCount === 1 ? '' : 's'}
              </p>
            </div>

            {/* The email is rendered in a sandboxed iframe: it's a full HTML
                document with its own <html>/<body>, and its styles must not
                leak into the admin panel. */}
            <iframe
              title="Newsletter preview"
              srcDoc={preview.html}
              sandbox=""
              className="h-[26rem] w-full rounded-xl border border-white/10 bg-white"
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </Button>
              <Button type="button" onClick={onSendNow} disabled={busy}>
                <Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Send this now'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
