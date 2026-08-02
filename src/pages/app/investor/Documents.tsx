import { useState } from 'react';
import {
  Award,
  Download,
  FileArchive,
  FileBadge,
  FileSpreadsheet,
  FileText,
  Receipt,
  ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/finance/Controls';
import { ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  downloadDocument,
  getMyDocuments,
  type DocumentLibrary,
  type InvestorDocumentRecord,
} from '@/lib/financeApi';
import { useInvestorData } from './useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDate } from '@/lib/format';

/**
 * ============================================================================
 *  12. DOCUMENTS
 * ============================================================================
 *
 * The paper trail: agreement, share certificate, receipts, invoices, GST
 * bills, reports.
 *
 * Downloads go through the API rather than linking to storage directly. A
 * storage URL is a bearer token — anyone holding the link can fetch the file —
 * and an investor agreement is not something that should be readable by
 * whoever happens to find the URL.
 * ============================================================================
 */

const CATEGORY_ICON: Record<string, LucideIcon> = {
  INVESTOR_AGREEMENT: ScrollText,
  SHARE_CERTIFICATE: Award,
  INVESTMENT_RECEIPT: Receipt,
  INVOICE: FileText,
  GST_BILL: FileSpreadsheet,
  REPORT: FileBadge,
  OTHER: FileArchive,
};

/** Bytes to a human size. Files this small never need more than one decimal. */
function fileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InvestorDocuments() {
  const toast = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, loading, error, reload } = useInvestorData<DocumentLibrary>(
    () => getMyDocuments(),
    [],
  );

  const download = async (document: InvestorDocumentRecord) => {
    setDownloading(document._id);
    try {
      await downloadDocument(
        document._id,
        document.file?.originalName ?? `${document.title}.pdf`,
      );
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Records"
        title="Documents"
        subtitle="Your agreement, certificates, receipts and reports — all downloadable."
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : data.total === 0 ? (
        <InfoNote tone="info" icon={FileArchive}>
          No documents have been shared with you yet. Your investor agreement, share
          certificate and payment receipts will appear here as the admin team uploads
          them.
        </InfoNote>
      ) : (
        <div className="space-y-8">
          {data.byCategory.map((group) => {
            const Icon = CATEGORY_ICON[group.category] ?? FileArchive;

            return (
              <section key={group.category} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                  <Icon className="h-4 w-4 text-brand-300" />
                  {group.label}
                  <span className="text-xs font-normal text-slate-500">
                    ({group.documents.length})
                  </span>
                </h2>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.documents.map((document) => (
                    <article
                      key={document._id}
                      className="glass-card card-lift flex flex-col gap-3 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-white">
                            {document.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {document.issuedAt
                              ? `Issued ${formatDate(document.issuedAt)}`
                              : `Added ${formatDate(document.createdAt)}`}
                            {document.file?.size ? ` · ${fileSize(document.file.size)}` : ''}
                          </p>
                        </div>
                      </div>

                      {document.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                          {document.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        {document.fileUnavailable ? (
                          <Pill tone="red">File unavailable</Pill>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void download(document)}
                            disabled={downloading === document._id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.11] hover:text-white disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloading === document._id ? 'Downloading…' : 'Download'}
                          </button>
                        )}

                        {!document.viewedAt && !document.fileUnavailable && (
                          <Pill tone="blue">New</Pill>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}

          <p className="text-xs leading-relaxed text-slate-500">
            Every download is served through an authenticated request, so these files are
            reachable only by you and the admin team.
          </p>
        </div>
      )}
    </div>
  );
}
