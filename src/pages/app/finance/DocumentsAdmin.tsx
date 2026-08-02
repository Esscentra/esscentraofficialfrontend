import { useState } from 'react';
import { Download, EyeOff, FileArchive, Plus, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, SelectControl } from '@/components/finance/Controls';
import { ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  DOCUMENT_CATEGORIES,
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
  type DocumentCategory,
  type InvestorDocumentRecord,
} from '@/lib/financeApi';
import { listInvestors, type InvestorDirectoryEntry } from '@/lib/investorFinanceApi';
import { useInvestorData } from '../investor/useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDate, humanize } from '@/lib/format';

/**
 * ============================================================================
 *  ADMIN — INVESTOR DOCUMENTS
 * ============================================================================
 *
 * Upload agreements, share certificates, receipts, invoices, GST bills and
 * reports to a specific investor.
 *
 * Every document is owned by exactly one investor — there is no "share with
 * everyone" option, because a share certificate is not a broadcast. The
 * visibility toggle lets a document be staged before it is ready to be seen.
 * ============================================================================
 */

interface DocumentsData {
  documents: InvestorDocumentRecord[];
  investors: InvestorDirectoryEntry[];
}

function ownerName(row: InvestorDocumentRecord): string {
  const owner = row.investorId;
  if (typeof owner === 'string') return 'Investor';
  return [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'Investor';
}

export default function DocumentsAdmin() {
  const toast = useToast();
  const [filterInvestor, setFilterInvestor] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, error, reload } = useInvestorData<DocumentsData>(
    async () => {
      const [documents, investors] = await Promise.all([
        listDocuments({ investorId: filterInvestor || undefined }),
        listInvestors(),
      ]);
      return { documents, investors };
    },
    [filterInvestor],
  );

  const download = async (row: InvestorDocumentRecord) => {
    setBusy(row._id);
    try {
      await downloadDocument(row._id, row.file?.originalName ?? `${row.title}.pdf`);
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (row: InvestorDocumentRecord) => {
    if (!window.confirm(`Delete "${row.title}"? The file will be removed permanently.`)) return;

    try {
      await deleteDocument(row._id);
      toast.success('Deleted', 'The document has been removed.');
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Investor documents"
        subtitle="Agreements, certificates, receipts and reports, shared with a specific investor."
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Upload document
          </Button>
        }
      />

      <div className="glass-card flex flex-wrap items-end gap-3 p-4">
        <SelectControl
          label="Investor"
          value={filterInvestor}
          onChange={setFilterInvestor}
          options={[
            { value: '', label: 'All investors' },
            ...(data?.investors ?? []).map((investor) => ({
              value: investor.id,
              label: investor.name,
            })),
          ]}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <FinanceTable<InvestorDocumentRecord>
          rows={data.documents}
          rowKey={(row) => row._id}
          emptyTitle="No documents uploaded"
          emptyMessage="Upload the investor agreement and share certificate to get started."
          maxHeight={640}
          columns={[
            {
              key: 'title',
              header: 'Document',
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{row.title}</p>
                  {row.description && (
                    <p className="truncate text-xs text-slate-500">{row.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'investor',
              header: 'Investor',
              render: (row) => <span className="text-slate-300">{ownerName(row)}</span>,
            },
            {
              key: 'category',
              header: 'Category',
              render: (row) => <Pill tone="blue">{humanize(row.category)}</Pill>,
            },
            {
              key: 'issued',
              header: 'Issued',
              hideOnMobile: true,
              render: (row) => (
                <span className="whitespace-nowrap text-slate-400">
                  {formatDate(row.issuedAt ?? row.createdAt)}
                </span>
              ),
            },
            {
              key: 'visibility',
              header: 'Visible',
              align: 'center',
              render: (row) =>
                row.visibleToInvestor ? (
                  <Pill tone="green">Shared</Pill>
                ) : (
                  <Pill tone="gray">
                    <EyeOff className="h-3 w-3" />
                    Hidden
                  </Pill>
                ),
            },
            {
              key: 'viewed',
              header: 'Opened',
              align: 'center',
              hideOnMobile: true,
              render: (row) =>
                row.viewedAt ? (
                  <span className="text-xs text-slate-400">{formatDate(row.viewedAt)}</span>
                ) : (
                  <span className="text-xs text-slate-600">Not yet</span>
                ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    disabled={busy === row._id || row.fileUnavailable}
                    onClick={() => void download(row)}
                    className="rounded-lg p-1.5 text-brand-300 transition hover:bg-brand-500/10 disabled:opacity-40"
                    aria-label="Download document"
                    title={row.fileUnavailable ? 'File unavailable' : 'Download'}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                    aria-label="Delete document"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <UploadModal
        open={showForm}
        investors={data?.investors ?? []}
        onClose={() => setShowForm(false)}
        onUploaded={() => {
          setShowForm(false);
          reload();
        }}
      />
    </div>
  );
}

function UploadModal({
  open,
  investors,
  onClose,
  onUploaded,
}: {
  open: boolean;
  investors: InvestorDirectoryEntry[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const toast = useToast();
  const [investorId, setInvestorId] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('INVESTOR_AGREEMENT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [visible, setVisible] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      toast.error('No file selected', 'Choose the document to upload.');
      return;
    }
    if (!investorId) {
      toast.error('No investor selected', 'Choose who this document belongs to.');
      return;
    }

    setSaving(true);
    try {
      await uploadDocument(
        {
          investorId,
          category,
          title,
          description: description || undefined,
          issuedAt: issuedAt || undefined,
          visibleToInvestor: visible,
        },
        file,
      );

      toast.success('Uploaded', visible ? 'The investor has been notified.' : 'Saved as hidden.');
      setTitle('');
      setDescription('');
      setIssuedAt('');
      setFile(null);
      onUploaded();
    } catch (thrown) {
      toast.error('Upload failed', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload a document">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectControl
            label="Investor"
            value={investorId}
            onChange={setInvestorId}
            options={[
              { value: '', label: 'Select an investor…' },
              ...investors.map((investor) => ({ value: investor.id, label: investor.name })),
            ]}
          />
          <SelectControl
            label="Category"
            value={category}
            onChange={(value) => setCategory(value as DocumentCategory)}
            options={DOCUMENT_CATEGORIES.map((value) => ({ value, label: humanize(value) }))}
          />
        </div>

        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Input
          label="Date on the document"
          type="date"
          value={issuedAt}
          onChange={(event) => setIssuedAt(event.target.value)}
          hint="Often earlier than the upload date"
        />

        <label className="block space-y-1.5">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            File
          </span>
          <input
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/[0.14]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-200">Share with the investor now</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Turn this off to stage the document without notifying them.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-label="Share with the investor"
            onClick={() => setVisible((prev) => !prev)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              visible ? 'bg-brand-500' : 'bg-white/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                visible ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <InfoNote tone="neutral" icon={FileArchive}>
          Downloads are served through an authenticated request, so only this investor and
          the admin team can open the file.
        </InfoNote>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  );
}
