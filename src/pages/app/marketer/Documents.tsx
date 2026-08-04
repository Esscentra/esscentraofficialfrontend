import { useState } from 'react';
import { Download, FileSignature, FileText, FolderArchive } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  getMarketerDocuments,
  type MarketerDocument,
  type MarketerDocumentsView,
} from '@/lib/marketerApi';
import { downloadFromApi } from '@/lib/download';
import { useMarketerData } from './useMarketerData';
import { formatDate, humanize } from '@/lib/format';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  DOCUMENTS — the contractor's agreements
 * ============================================================================
 *
 * The files are attached to the tasks they belong to; this page flattens them
 * into the list the contractor actually thinks in — "my agreements" — without
 * moving where they are stored. Downloads still go through the task route,
 * which re-checks permission on every request rather than handing out a
 * storage URL that would keep working after the engagement ends.
 * ============================================================================
 */

const CATEGORY_TONE: Record<string, 'green' | 'blue' | 'violet' | 'gray'> = {
  AGREEMENT: 'green',
  INVOICE: 'blue',
  REPORT: 'violet',
  OTHER: 'gray',
};

type Tab = '' | 'AGREEMENT' | 'INVOICE' | 'REPORT';

function fileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MarketerDocuments() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('');

  const { data, loading, error, reload } = useMarketerData<MarketerDocumentsView>(
    () => getMarketerDocuments(),
    [],
  );

  const download = async (row: MarketerDocument) => {
    if (row.unavailable) {
      toast.error(
        'File unavailable',
        'This document was stored on a file account that is no longer connected.',
      );
      return;
    }

    try {
      await downloadFromApi(
        `/tasks/${row.taskId}/documents/${row.id}/download`,
        row.originalName || `${row.title}.pdf`,
      );
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your engagement" title="Documents" />
        <CardGridSkeleton count={3} />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your engagement" title="Documents" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const rows = tab ? data.rows.filter((row) => row.category === tab) : data.rows;

  const TABS: Array<{ value: Tab; label: string; count: number }> = [
    { value: '', label: 'All', count: data.total },
    { value: 'AGREEMENT', label: 'Agreements', count: data.byCategory.AGREEMENT ?? 0 },
    { value: 'INVOICE', label: 'Invoices', count: data.byCategory.INVOICE ?? 0 },
    { value: 'REPORT', label: 'Reports', count: data.byCategory.REPORT ?? 0 },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your engagement"
        title="Documents"
        subtitle="Your agreements and every other file shared with you, ready to download."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinanceCard
          icon={FileSignature}
          label="Agreements"
          value={data.byCategory.AGREEMENT ?? 0}
          hint="Signed terms of your engagement"
          tone="green"
        />
        <FinanceCard
          icon={FileText}
          label="Invoices & reports"
          value={(data.byCategory.INVOICE ?? 0) + (data.byCategory.REPORT ?? 0)}
          hint="Billing and reporting documents"
          tone="sky"
        />
        <FinanceCard
          icon={FolderArchive}
          label="All documents"
          value={data.total}
          hint="Shared with you across every task"
          tone="brand"
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
        title="Shared with you"
        description="Uploaded by the Esscentra team against your tasks."
      >
        <FinanceTable<MarketerDocument>
          rows={rows}
          rowKey={(row) => row.id}
          emptyTitle={tab === 'AGREEMENT' ? 'No agreements yet' : 'No documents yet'}
          emptyMessage="Documents shared with you will appear here as soon as they are uploaded."
          maxHeight={620}
          columns={[
            {
              key: 'title',
              header: 'Document',
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-100">{row.title}</p>
                  <p className="truncate text-xs text-slate-500">{row.taskTitle}</p>
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
              key: 'uploaded',
              header: 'Shared',
              hideOnMobile: true,
              render: (row) => (
                <span className="whitespace-nowrap text-slate-400">
                  {row.uploadedAt ? formatDate(row.uploadedAt) : '—'}
                </span>
              ),
            },
            {
              key: 'size',
              header: 'Size',
              numeric: true,
              hideOnMobile: true,
              render: (row) => (
                <span className="text-xs text-slate-500">{fileSize(row.sizeBytes)}</span>
              ),
            },
            {
              key: 'actions',
              header: 'Download',
              align: 'center',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => void download(row)}
                  disabled={row.unavailable}
                  className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  title={row.unavailable ? 'File unavailable' : 'Download'}
                  aria-label={`Download ${row.title}`}
                >
                  <Download className="h-4 w-4" />
                </button>
              ),
            },
          ]}
        />
      </Section>
    </div>
  );
}
