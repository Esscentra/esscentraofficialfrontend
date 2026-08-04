import { useState } from 'react';
import {
  Download,
  Eye,
  FileSignature,
  FileText,
  Receipt,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  downloadClientDocument,
  getClientDocuments,
  type ClientDocumentRow,
  type ClientDocumentsView,
} from '@/lib/clientApi';
import { downloadInvoicePdf, viewInvoicePdf } from '@/lib/invoiceApi';
import { useClientData } from './useClientData';
import { humanize, inr } from '@/lib/format';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  CLIENT DOCUMENTS
 * ============================================================================
 *
 * Agreements, invoices and bills in one list.
 *
 * The invoices are read live from the Invoices module rather than copied
 * here, so what a client downloads is always the document that was actually
 * issued — not a stale duplicate of it.
 * ============================================================================
 */

function ddmmyyyy(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

function fileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_TONE: Record<string, 'green' | 'blue' | 'violet' | 'gray' | 'teal'> = {
  AGREEMENT: 'green',
  INVOICE: 'blue',
  BILL: 'teal',
  REPORT: 'violet',
  OTHER: 'gray',
};

const STATUS_TONE: Record<string, 'green' | 'amber' | 'gray'> = {
  PAID: 'green',
  ISSUED: 'amber',
  CANCELLED: 'gray',
};

type Tab = '' | 'AGREEMENT' | 'INVOICE' | 'BILL';

export default function ClientDocuments() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('');

  const { data, loading, error, reload } = useClientData<ClientDocumentsView>(
    () => getClientDocuments(),
    [],
  );

  const open = async (row: ClientDocumentRow) => {
    if (row.source !== 'INVOICE') return;
    try {
      await viewInvoicePdf(row.id);
    } catch (thrown) {
      toast.error('Could not open', getErrorMessage(thrown));
    }
  };

  const download = async (row: ClientDocumentRow) => {
    if (row.unavailable) {
      toast.error(
        'File unavailable',
        'This document was stored on a file account that is no longer connected.',
      );
      return;
    }

    try {
      if (row.source === 'INVOICE') {
        await downloadInvoicePdf(row.id, `${row.reference ?? 'document'}.pdf`);
      } else {
        await downloadClientDocument(
          row.id,
          row.originalName || `${row.title}.pdf`,
        );
      }
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your account" title="Documents" />
        <CardGridSkeleton count={3} />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your account" title="Documents" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const rows = tab ? data.rows.filter((row) => row.category === tab) : data.rows;

  const TABS: Array<{ value: Tab; label: string; count: number }> = [
    { value: '', label: 'All', count: data.total },
    { value: 'AGREEMENT', label: 'Agreements', count: data.byCategory.AGREEMENT ?? 0 },
    { value: 'INVOICE', label: 'Invoices', count: data.byCategory.INVOICE ?? 0 },
    { value: 'BILL', label: 'Bills', count: data.byCategory.BILL ?? 0 },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your account"
        title="Documents"
        subtitle="Everything on paper between us — agreements you signed, invoices we raised, and the bills confirming payment."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinanceCard
          icon={FileSignature}
          label="Agreements"
          value={data.byCategory.AGREEMENT ?? 0}
          hint="Signed terms of work"
          tone="green"
        />
        <FinanceCard
          icon={Wallet}
          label="Invoices"
          value={data.byCategory.INVOICE ?? 0}
          hint="Raised to your company"
          tone="brand"
        />
        <FinanceCard
          icon={Receipt}
          label="Payment bills"
          value={data.byCategory.BILL ?? 0}
          hint="Confirming money received"
          tone="teal"
        />
      </div>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {TABS.map((entry) => {
          const active = tab === entry.value;
          return (
            <button
              key={entry.value || 'all'}
              type="button"
              onClick={() => setTab(entry.value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {entry.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? 'bg-white/20 !text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {entry.count}
              </span>
            </button>
          );
        })}
      </div>

      <Section
        title="Your paperwork"
        description="Newest first. Invoices open as the PDF we issued."
      >
        <FinanceTable<ClientDocumentRow>
          rows={rows}
          rowKey={(row) => `${row.source}-${row.id}`}
          emptyTitle={
            tab === 'AGREEMENT'
              ? 'No agreements yet'
              : tab === 'INVOICE'
                ? 'No invoices yet'
                : tab === 'BILL'
                  ? 'No bills yet'
                  : 'No documents yet'
          }
          emptyMessage="Documents shared with your company will appear here."
          maxHeight={640}
          columns={[
            {
              key: 'title',
              header: 'Document',
              render: (row) => (
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${
                      row.category === 'AGREEMENT'
                        ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25'
                        : row.category === 'BILL'
                          ? 'bg-teal-500/10 text-teal-300 ring-teal-400/25'
                          : 'bg-brand-500/10 text-brand-300 ring-brand-400/25'
                    }`}
                  >
                    {row.category === 'AGREEMENT' ? (
                      <FileSignature className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">
                      {row.reference ?? row.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.projectName ?? row.description ?? row.title}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Type',
              render: (row) => (
                <Pill tone={CATEGORY_TONE[row.category] ?? 'gray'}>
                  {humanize(row.category)}
                </Pill>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              hideOnMobile: true,
              render: (row) => (
                <span className="whitespace-nowrap text-slate-300">
                  {ddmmyyyy(row.date)}
                </span>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              numeric: true,
              render: (row) =>
                row.amount === null ? (
                  <span className="text-xs text-slate-500">
                    {fileSize(row.sizeBytes)}
                  </span>
                ) : (
                  <span className="font-semibold text-white">{inr(row.amount)}</span>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              hideOnMobile: true,
              render: (row) =>
                row.status ? (
                  <Pill tone={STATUS_TONE[row.status] ?? 'gray'}>
                    {humanize(row.status)}
                  </Pill>
                ) : (
                  <span className="text-slate-600">—</span>
                ),
            },
            {
              key: 'actions',
              header: '',
              align: 'center',
              render: (row) => (
                <div className="flex items-center justify-center gap-1">
                  {row.source === 'INVOICE' && (
                    <button
                      type="button"
                      onClick={() => void open(row)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label={`View ${row.reference}`}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void download(row)}
                    disabled={row.unavailable}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label={`Download ${row.title}`}
                    title={row.unavailable ? 'File unavailable' : 'Download'}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Section>
    </div>
  );
}
