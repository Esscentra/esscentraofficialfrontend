import { useEffect, useState } from 'react';
import { CircleSlash, Eye, Mail, MailWarning, TriangleAlert } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { StatusBadge, type Tone } from './StatusBadge';
import { EmailPreviewModal } from './EmailPreviewModal';
import {
  EMAIL_TEMPLATE_LABEL,
  getEmailLog,
  listEmailLogs,
  type EmailLog,
  type EmailStatus,
} from '@/lib/emailApi';
import { getErrorMessage, isNotFound } from '@/lib/utils';

const STATUS_TONE: Record<EmailStatus, Tone> = {
  SENT: 'green',
  FAILED: 'red',
  SKIPPED: 'amber',
};

const STATUS_LABEL: Record<EmailStatus, string> = {
  SENT: 'Sent',
  FAILED: 'Failed',
  SKIPPED: 'Not sent',
};

function fmtWhen(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/**
 * Email delivery history for one user (admin view).
 *
 * Answers three things per row: did the mail go out, what did it say, and — if
 * it didn't go out — why. The list endpoint omits the HTML body, so the full
 * record is fetched lazily when the admin clicks through to a preview.
 */
export function EmailDeliveryPanel({
  userId,
  title = 'Email delivery',
  limit = 20,
  className,
}: {
  userId: string;
  title?: string;
  limit?: number;
  className?: string;
}) {
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<EmailLog | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLogs(null);
    setError(null);

    listEmailLogs({ userId, limit })
      .then((rows) => {
        if (active) setLogs(rows);
      })
      .catch((e) => {
        if (!active) return;
        // The delivery log is a newer endpoint — if it isn't there yet, show
        // an empty history rather than a red banner on the whole panel.
        if (isNotFound(e)) setLogs([]);
        else setError(getErrorMessage(e, 'Could not load the email history.'));
      });

    return () => {
      active = false;
    };
  }, [userId, limit]);

  const openPreview = async (log: EmailLog) => {
    // Show the row we already have while the body loads — the header fills in
    // instantly and only the iframe waits.
    setPreview(log);
    setPreviewError(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const full = await getEmailLog(log.id);
      setPreview(full);
    } catch (e) {
      setPreviewError(getErrorMessage(e, 'Could not load the message body.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className={`glass-card p-5 ${className ?? ''}`}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-400/15 text-brand-200 ring-1 ring-brand-400/30">
          <Mail className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-slate-500">
            Every email this investor was meant to receive, and what happened to it
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/[0.06] px-4 py-3">
          <TriangleAlert className="h-4 w-4 shrink-0 text-rose-300" />
          <p className="text-sm text-rose-100">{error}</p>
        </div>
      ) : !logs ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <CircleSlash className="h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-xs text-slate-400">
            No emails have been triggered for this investor yet.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 border-t border-white/10">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${
                  log.status === 'SENT'
                    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20'
                    : log.status === 'FAILED'
                      ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20'
                      : 'bg-amber-500/10 text-amber-300 ring-amber-400/20'
                }`}
              >
                {log.status === 'SENT' ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <MailWarning className="h-3.5 w-3.5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {EMAIL_TEMPLATE_LABEL[log.template]}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {log.subject} · {fmtWhen(log.sentAt || log.createdAt)}
                </p>
                {/* The whole point of the panel: a negative answer with a reason. */}
                {log.status !== 'SENT' && log.reason && (
                  <p className="mt-1 text-xs text-amber-200/90">{log.reason}</p>
                )}
              </div>

              <StatusBadge tone={STATUS_TONE[log.status]}>
                {STATUS_LABEL[log.status]}
              </StatusBadge>

              <button
                type="button"
                onClick={() => void openPreview(log)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
            </li>
          ))}
        </ul>
      )}

      <EmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        log={preview}
        loading={previewLoading}
        error={previewError}
      />
    </div>
  );
}
