import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  FileText,
  HandCoins,
  Image as ImageIcon,
  Receipt,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { StatusBadge, type Tone } from './ui/StatusBadge';
import { FilePreviewModal } from './ui/FilePreviewModal';
import { NextDuePanel } from './ui/NextDueCard';
import { EmailDeliveryPanel } from './ui/EmailDeliveryPanel';
import { getCommitment, listCommitments, type Commitment } from '@/lib/commitmentApi';
import { listInvestments, type Investment } from '@/lib/investmentApi';
import { downloadUrlAsFile } from '@/lib/download';
import { getErrorMessage } from '@/lib/utils';
import type { User } from '@/types';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const fmtFull = (n: number) => inr.format(n || 0);

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  COMPLETED: 'blue',
  CANCELLED: 'red',
};

type Preview = { url: string; name: string; kind: 'pdf' | 'image' } | null;

export function InvestorRecordsModal({
  open,
  onClose,
  investor,
}: {
  open: boolean;
  onClose: () => void;
  investor: User | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [preview, setPreview] = useState<Preview>(null);

  // Escape + scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Load this investor's commitments + investments (admin endpoints, filtered).
  // The list endpoint returns totals only — fetch each commitment's detail to
  // get its payments (invoices) and expenses (bills/receipts).
  useEffect(() => {
    if (!open || !investor) return;
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [commits, invs] = await Promise.all([listCommitments(), listInvestments()]);
        if (!active) return;
        const mine = commits.filter((c) => c.investor?.id === investor.id);
        const detailed = await Promise.all(
          mine.map((c) => getCommitment(c.id).catch(() => c)),
        );
        if (!active) return;
        setCommitments(detailed);
        setInvestments(invs.filter((i) => i.investor?.id === investor.id));
      } catch (e) {
        if (active) setError(getErrorMessage(e, 'Could not load investor records.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, investor]);

  // Standalone investments (installments already show under their commitment).
  const standalone = investments.filter((i) => !i.commitment);

  const totalCommitted = commitments.reduce((s, c) => s + c.committedAmount, 0);
  const totalReceived =
    commitments.reduce((s, c) => s + c.receivedTotal, 0) +
    standalone.reduce((s, i) => s + i.amount, 0);
  const totalSpent = commitments.reduce((s, c) => s + c.spentTotal, 0);
  const balance = totalReceived - totalSpent;

  const openPdf = (url?: string, name?: string) =>
    url && setPreview({ url, name: name || 'invoice.pdf', kind: 'pdf' });

  const hasRecords = commitments.length > 0 || standalone.length > 0;

  return createPortal(
    <>
      {/* AnimatePresence must wrap ONLY the element that mounts/unmounts. The
          nested preview modals are siblings — inside, they were unkeyed
          children colliding with the panel on the empty key. */}
      <AnimatePresence>
        {open && investor && (
          <motion.div
            key="investor-records"
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="glass-card relative z-10 my-4 w-full max-w-4xl !rounded-2xl p-0"
              role="dialog"
              aria-modal="true"
              aria-label="Investor records"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-inherit px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
                    <HandCoins className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-white">
                      Investor records
                    </h2>
                    <p className="truncate text-xs text-slate-400">
                      {investor.name} · {investor.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {loading ? (
                  <LoadingBody />
                ) : error ? (
                  <div className="grid place-items-center py-16 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
                      <TriangleAlert className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-white">Couldn’t load records</p>
                    <p className="mt-1 max-w-sm text-xs text-slate-400">{error}</p>
                  </div>
                ) : !hasRecords ? (
                  <div className="grid place-items-center py-16 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-slate-400 ring-1 ring-white/10">
                      <Wallet className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-white">No investor records yet</p>
                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                      This investor has no commitments or recorded investments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary tiles */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <SummaryTile label="Committed" value={fmtFull(totalCommitted)} accent />
                      <SummaryTile label="Paid in" value={fmtFull(totalReceived)} />
                      <SummaryTile label="Spent" value={fmtFull(totalSpent)} />
                      <SummaryTile label="Balance" value={fmtFull(balance)} />
                    </div>

                    {/* Next payment due for this investor (admin endpoint). */}
                    <NextDuePanel
                      investorId={investor.id}
                      title={`Next payment due · ${investor.name}`}
                    />

                    {/* Commitments */}
                    {commitments.map((c) => (
                      <CommitmentCard key={c.id} c={c} onPreviewPdf={openPdf} onPreview={setPreview} />
                    ))}

                    {/* Was the reminder mail actually sent? If not, why not. */}
                    <EmailDeliveryPanel userId={investor.id} />

                    {/* Standalone investments */}
                    {standalone.length > 0 && (
                      <div className="glass-card p-5">
                        <div className="mb-3 flex items-center gap-2.5">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-400/15 text-brand-200 ring-1 ring-brand-400/30">
                            <Wallet className="h-[18px] w-[18px]" />
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-white">Direct investments</h3>
                            <p className="text-[11px] text-slate-500">
                              Payments not tied to a commitment
                            </p>
                          </div>
                        </div>
                        <ul className="divide-y divide-white/5">
                          {standalone.map((i) => (
                            <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                                <Receipt className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white tabular-nums">{fmtFull(i.amount)}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {fmtDate(i.investedAt)}
                                  {i.notes ? ` · ${i.notes}` : ''}
                                </p>
                              </div>
                              <InvoiceActions
                                url={i.invoiceUrl}
                                name={i.invoiceName}
                                onView={() => openPdf(i.invoiceUrl, i.invoiceName)}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nested file preview */}
      <FilePreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        url={preview?.url}
        title={preview?.name || 'Document'}
        subtitle="Document preview"
        kind={preview?.kind ?? 'pdf'}
        onDownload={
          preview ? () => void downloadUrlAsFile(preview.url, preview.name) : undefined
        }
      />
    </>,
    document.body,
  );
}

/* ------------------------------- sub-pieces ------------------------------- */

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? 'border-brand-400/25 bg-brand-500/[0.08]' : 'border-white/[0.07] bg-white/[0.03]'
      }`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className="font-display text-[15px] font-bold leading-tight text-white tabular-nums"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function InvoiceActions({
  url,
  name,
  onView,
}: {
  url?: string;
  name?: string;
  onView: () => void;
}) {
  if (!url) return <span className="text-[11px] text-slate-500">Invoice pending</span>;
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onView}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
      >
        <FileText className="h-3.5 w-3.5" /> View
      </button>
      <button
        type="button"
        onClick={() => void downloadUrlAsFile(url, name || 'invoice.pdf')}
        className="grid h-8 w-8 place-items-center rounded-lg border border-brand-400/30 bg-brand-500/10 text-brand-200 transition hover:bg-brand-500/20"
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function CommitmentCard({
  c,
  onPreviewPdf,
  onPreview,
}: {
  c: Commitment;
  onPreviewPdf: (url?: string, name?: string) => void;
  onPreview: (p: Preview) => void;
}) {
  const pct =
    c.committedAmount > 0 ? Math.min(100, Math.round((c.receivedTotal / c.committedAmount) * 100)) : 0;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-700/10 text-emerald-200 ring-1 ring-emerald-400/30">
            <HandCoins className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-white">{c.title}</h3>
            <p className="text-xs text-slate-500">Started {fmtDate(c.startDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={STATUS_TONE[c.status] ?? 'gray'}>{c.status.toLowerCase()}</StatusBadge>
          <span className="text-xs text-slate-400">
            <span className="font-semibold text-white tabular-nums">{pct}%</span> funded
          </span>
        </div>
      </div>

      {/* Amount tiles */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          { label: 'Committed', value: fmtFull(c.committedAmount), accent: true },
          { label: 'Paid so far', value: fmtFull(c.receivedTotal) },
          { label: 'Remaining', value: fmtFull(c.remainingToReceive) },
          { label: 'Spent', value: fmtFull(c.spentTotal) },
          { label: 'Balance', value: fmtFull(c.balanceAvailable) },
        ].map((t) => (
          <SummaryTile key={t.label} label={t.label} value={t.value} accent={t.accent} />
        ))}
      </div>

      {/* Funding meter */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-500/15 ring-1 ring-inset ring-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          style={{ width: `${pct}%` }}
        />
      </div>

      {c.notes && (
        <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Terms / notes: </span>
          {c.notes}
        </p>
      )}

      {/* Invoices (installment payments) */}
      {c.payments && c.payments.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Invoices ({c.payments.length})
          </p>
          <ul className="space-y-1.5">
            {c.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white tabular-nums">{fmtFull(p.amount)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {fmtDate(p.investedAt)}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>
                <InvoiceActions
                  url={p.invoiceUrl}
                  name={p.invoiceName}
                  onView={() => onPreviewPdf(p.invoiceUrl, p.invoiceName)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expenses — bills / receipts / agreements */}
      {c.expenses && c.expenses.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Bills &amp; receipts ({c.expenses.length})
          </p>
          <ul className="space-y-2">
            {c.expenses.map((x) => (
              <li key={x.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm text-slate-200">
                    {x.category || x.description || 'Expense'}
                    <span className="ml-1.5 text-xs text-slate-500">{fmtDate(x.spentAt)}</span>
                  </p>
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {fmtFull(x.amount)}
                  </span>
                </div>
                {x.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {x.attachments.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onPreview({ url: a.url, name: a.name, kind: a.isPdf ? 'pdf' : 'image' })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.06]"
                        >
                          {a.isPdf ? (
                            <FileText className="h-3.5 w-3.5 text-brand-300" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5 text-brand-300" />
                          )}
                          <span className="max-w-[9rem] truncate">{a.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadUrlAsFile(a.url, a.name)}
                          className="grid h-8 w-8 shrink-0 place-items-center border-l border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="glass-card p-5">
          <Skeleton className="h-6 w-48" />
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-14 rounded-xl" />
            ))}
          </div>
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
