import { useMemo, useState } from 'react';
import {
  Coins,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  PiggyBank,
  Receipt,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChart } from '@/components/charts/BarChart';
import { SERIES, categoricalColor } from '@/components/charts/chartTheme';
import { ProgressBar } from '@/components/charts/CircularProgress';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { useToast } from '@/components/ui/Toast';
import {
  getFundUsage,
  type FundUsageAttachment,
  type FundUsageExpense,
  type FundUsageView,
} from '@/lib/investorFinanceApi';
import { downloadInvoicePdf, viewInvoicePdf } from '@/lib/invoiceApi';
import { downloadUrlAsFile } from '@/lib/download';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, percent } from '@/lib/format';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  FUND USAGE — where the investor's capital actually went
 * ============================================================================
 *
 * Committed → Paid → Spent → Balance, and then every rupee of that spend
 * itemised with the receipt behind it.
 *
 * The point of this page is that "we spent your money well" is a claim, and a
 * claim without the bill attached is just a claim. Every line here carries its
 * proof, so an investor can audit the company rather than trust it.
 * ============================================================================
 */

const isPdf = (file: FundUsageAttachment): boolean =>
  file.resourceType === 'raw' ||
  (file.mimeType ?? '').includes('pdf') ||
  (file.originalName ?? '').toLowerCase().endsWith('.pdf');

const fileName = (file: FundUsageAttachment, fallback: string): string =>
  file.originalName?.trim() || `${fallback}.${isPdf(file) ? 'pdf' : 'jpg'}`;

export default function InvestorFundUsage() {
  const toast = useToast();
  const { data, loading, error, reload } = useInvestorData<FundUsageView>(
    () => getFundUsage(),
    [],
  );

  const [preview, setPreview] = useState<{
    url: string;
    title: string;
    kind: 'pdf' | 'image';
    filename: string;
  } | null>(null);

  const rows = useMemo(() => data?.expenses ?? [], [data]);

  const openAttachment = (file: FundUsageAttachment, label: string) => {
    if (file.unavailable) {
      toast.error(
        'File unavailable',
        'This receipt was stored on a file account that is no longer connected.',
      );
      return;
    }
    setPreview({
      url: file.url,
      title: fileName(file, label),
      kind: isPdf(file) ? 'pdf' : 'image',
      filename: fileName(file, label),
    });
  };

  const saveAttachment = async (file: FundUsageAttachment, label: string) => {
    if (file.unavailable) {
      toast.error(
        'File unavailable',
        'This receipt was stored on a file account that is no longer connected.',
      );
      return;
    }
    try {
      await downloadUrlAsFile(
        file.url,
        fileName(file, label),
        isPdf(file) ? 'application/pdf' : 'image/jpeg',
      );
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    }
  };

  const openDoc = async (id: string) => {
    try {
      await viewInvoicePdf(id);
    } catch (thrown) {
      toast.error('Could not open document', getErrorMessage(thrown));
    }
  };

  const saveDoc = async (id: string, number: string) => {
    try {
      await downloadInvoicePdf(id, `${number}.pdf`);
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your capital" title="Fund usage" />
        <CardGridSkeleton count={5} />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your capital" title="Fund usage" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const { summary, commitments, byCategory } = data;
  const overspent = summary.balance < 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your capital"
        title="Fund usage"
        subtitle="What you pledged, what you have paid, what Esscentra has spent out of it — and the receipt behind every rupee."
      />

      {/* --------------------------- headline figures -------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <FinanceCard
          icon={Wallet}
          label="Committed"
          value={summary.committed}
          format={inr}
          hint="Your total pledge"
          tone="brand"
        />
        <FinanceCard
          icon={Coins}
          label="Paid so far"
          value={summary.received}
          format={inr}
          hint={`${percent(summary.committed > 0 ? (summary.received / summary.committed) * 100 : 0, 2)} of the pledge`}
          tone="sky"
        />
        <FinanceCard
          icon={Receipt}
          label="Remaining"
          value={summary.remaining}
          format={inr}
          hint={summary.remaining > 0 ? 'Still to be paid in' : 'Fully funded'}
          tone="amber"
        />
        <FinanceCard
          icon={FileText}
          label="Spent"
          value={summary.spent}
          format={inr}
          hint={`${summary.expenseCount} item${summary.expenseCount === 1 ? '' : 's'} · ${percent(summary.utilisationPercent, 1)} of capital used`}
          tone="rose"
        />
        <FinanceCard
          icon={PiggyBank}
          label="Balance"
          value={summary.balance}
          format={inr}
          hint="Paid in, not yet spent"
          tone={overspent ? 'rose' : 'green'}
        />
      </div>

      {overspent && (
        <InfoNote tone="warning">
          Spend recorded against your capital ({inr(summary.spent)}) exceeds what you have
          paid in ({inr(summary.received)}). Please raise this with the Esscentra team.
        </InfoNote>
      )}

      {/* ------------------------------ utilisation ---------------------------- */}
      <section className="glass-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Capital utilisation
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {inr(summary.spent)} of {inr(summary.received)} paid-in capital has been
              deployed.
            </p>
          </div>
          <span className="font-display text-2xl font-bold tabular-nums text-white">
            {percent(summary.utilisationPercent, 1)}
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar value={summary.utilisationPercent} height={8} />
        </div>
      </section>

      {/* ----------------------------- per commitment -------------------------- */}
      {commitments.length > 0 && (
        <Section
          title="By commitment"
          description="Each pledge tracked on its own: paid in, spent, and what is left."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {commitments.map((commitment) => (
              <div key={commitment.commitmentId} className="glass-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {commitment.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Started {formatDate(commitment.startDate)} ·{' '}
                      {commitment.expenseCount} expense
                      {commitment.expenseCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Pill tone={commitment.status === 'COMPLETED' ? 'green' : 'blue'}>
                    {humanize(commitment.status)}
                  </Pill>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">Committed</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-white">
                      {inr(commitment.committedAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Paid so far</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-white">
                      {inr(commitment.receivedTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Remaining</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-amber-300">
                      {inr(commitment.remainingToReceive)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Spent</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-rose-300">
                      {inr(commitment.spentTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Balance</dt>
                    <dd
                      className={`mt-0.5 font-semibold tabular-nums ${
                        commitment.balanceAvailable < 0 ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {inr(commitment.balanceAvailable)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Utilised</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-slate-300">
                      {percent(commitment.utilisationPercent, 1)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <ProgressBar
                    value={commitment.utilisationPercent}
                    showLabel
                    label="Capital deployed"
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ------------------------------- charts -------------------------------- */}
      {byCategory.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartFrame
            title="Where your money went"
            subtitle="Share of spend by category"
            isEmpty={byCategory.length === 0}
          >
            <DonutChart
              slices={byCategory.map((category, index) => ({
                label: humanize(category.category),
                value: category.total,
                color: categoricalColor(index),
              }))}
              formatValue={inr}
              centerLabel="Spent"
            />
          </ChartFrame>

          <ChartFrame
            title="Spend per category"
            subtitle="Largest first"
            isEmpty={byCategory.length === 0}
          >
            <BarChart
              categories={byCategory.map((category) => humanize(category.category))}
              series={[
                {
                  key: 'spend',
                  label: 'Spend',
                  color: SERIES.expenses,
                  values: byCategory.map((category) => category.total),
                },
              ]}
            />
          </ChartFrame>
        </div>
      )}

      {/* ------------------------------ the ledger ----------------------------- */}
      <Section
        title="Bills & receipts"
        description="Every expense paid out of your capital, with the proof attached."
      >
        <FinanceTable<FundUsageExpense>
          rows={rows}
          rowKey={(row) => row.id}
          emptyTitle="Nothing spent yet"
          emptyMessage="Expenses paid out of your capital will appear here, each with its bill or receipt."
          maxHeight={640}
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (row) => (
                <span className="whitespace-nowrap text-slate-300">
                  {formatDate(row.date)}
                </span>
              ),
            },
            {
              key: 'category',
              header: 'Category',
              hideOnMobile: true,
              render: (row) => <Pill tone="blue">{humanize(row.category)}</Pill>,
            },
            {
              key: 'description',
              header: 'Description',
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate text-slate-200">{row.description || '—'}</p>
                  {row.commitmentTitle && (
                    <p className="truncate text-xs text-slate-500">
                      {row.commitmentTitle}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              numeric: true,
              render: (row) => (
                <span className="font-semibold text-white">{inr(row.amount)}</span>
              ),
            },
            {
              key: 'proof',
              header: 'Bill / receipt',
              render: (row) => {
                const label = row.description || row.category;
                if (row.attachments.length === 0 && !row.invoiceDoc) {
                  return <span className="text-slate-600">—</span>;
                }

                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.attachments.map((file, index) => (
                      <span
                        key={`${row.id}-${index}`}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${
                          file.unavailable
                            ? 'border-white/5 bg-white/[0.02] opacity-60'
                            : 'border-white/10 bg-white/[0.05]'
                        }`}
                      >
                        {isPdf(file) ? (
                          <FileText className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                        )}
                        <span className="max-w-[9rem] truncate text-[11px] text-slate-300">
                          {fileName(file, label)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openAttachment(file, label)}
                          disabled={file.unavailable}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          aria-label="View receipt"
                          title={file.unavailable ? 'File unavailable' : 'View'}
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveAttachment(file, label)}
                          disabled={file.unavailable}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          aria-label="Download receipt"
                          title={file.unavailable ? 'File unavailable' : 'Download'}
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </span>
                    ))}

                    {row.invoiceDoc && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            row.invoiceDoc.kind === 'BILL'
                              ? 'text-emerald-300'
                              : 'text-brand-300'
                          }`}
                        >
                          {row.invoiceDoc.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openDoc(row.invoiceDoc!.id)}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
                          aria-label="View document"
                          title="View"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void saveDoc(row.invoiceDoc!.id, row.invoiceDoc!.number)
                          }
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
                          aria-label="Download document"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                );
              },
            },
          ]}
          footer={
            <>
              <TotalCell numeric={false}>Total spent</TotalCell>
              <TotalCell numeric={false} hideOnMobile>
                <span />
              </TotalCell>
              <TotalCell numeric={false}>
                <span className="text-slate-400">
                  {summary.expenseCount} item{summary.expenseCount === 1 ? '' : 's'}
                </span>
              </TotalCell>
              <TotalCell>{inr(summary.spent)}</TotalCell>
              <TotalCell numeric={false}>
                <span className="text-slate-400">
                  Balance {inr(summary.balance)}
                </span>
              </TotalCell>
            </>
          }
        />
      </Section>

      <FilePreviewModal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        url={preview?.url}
        title={preview?.title ?? 'Receipt'}
        subtitle="Expense receipt"
        kind={preview?.kind ?? 'pdf'}
        onDownload={
          preview
            ? () =>
                void downloadUrlAsFile(
                  preview.url,
                  preview.filename,
                  preview.kind === 'pdf' ? 'application/pdf' : 'image/jpeg',
                )
            : undefined
        }
      />
    </div>
  );
}
