import { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { ProgressBar } from '@/components/charts/CircularProgress';
import { useToast } from '@/components/ui/Toast';
import {
  getInvestmentTimeline,
  type InvestmentTimeline,
  type TimelineEntry,
} from '@/lib/investorFinanceApi';
import {
  downloadInvoicePdf,
  getMyInvoices,
  viewInvoicePdf,
  type InvoiceRecord,
} from '@/lib/invoiceApi';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, percent } from '@/lib/format';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  2. INVESTMENT TIMELINE
 * ============================================================================
 *
 * Every rupee paid in, in order, with the equity each payment bought.
 *
 * The "Ownership earned" column is the point of this page. An investor who
 * pays ₹15,000 and then ₹1,532 should be able to see that those two payments
 * bought 1.5% and 0.1532%, and that the two add up to the 1.6532% shown on
 * their dashboard. If that reconciliation is not visible, the headline number
 * is just a number they have to take on trust.
 * ============================================================================
 */

type DocTab = 'INVOICE' | 'BILL';

export default function InvestorTimeline() {
  const toast = useToast();
  const { data, loading, error, reload } = useInvestorData<InvestmentTimeline>(
    () => getInvestmentTimeline(),
    [],
  );

  /* My generated documents (invoices raised to me + payment bills issued). */
  const { data: myDocs, loading: docsLoading } = useInvestorData<InvoiceRecord[]>(
    () => getMyInvoices(),
    [],
  );
  const [docTab, setDocTab] = useState<DocTab>('INVOICE');

  const openPdf = async (id: string) => {
    try {
      await viewInvoicePdf(id);
    } catch (thrown) {
      toast.error('Could not open PDF', getErrorMessage(thrown));
    }
  };

  const savePdf = async (id: string, number: string) => {
    try {
      await downloadInvoicePdf(id, `${number}.pdf`);
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Investment" title="Investment timeline" />
        <CardGridSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Investment" title="Investment timeline" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const { summary, entries, commitments } = data;
  const uncounted = data.uncountedPayments ?? [];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Investment"
        title="Investment timeline"
        subtitle="Every payment you have made, and the ownership each one unlocked."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={Wallet}
          label="Total invested"
          value={summary.totalInvested}
          format={inr}
          hint={`across ${summary.paymentCount} payment${summary.paymentCount === 1 ? '' : 's'}`}
          tone="brand"
        />
        <FinanceCard
          icon={CalendarClock}
          label="Committed"
          value={summary.committedInvestment}
          format={inr}
          hint={
            summary.isFullyFunded
              ? 'Fully funded'
              : `${inr(summary.remainingInvestment)} outstanding`
          }
          tone={summary.isFullyFunded ? 'green' : 'amber'}
        />
        <FinanceCard
          icon={TrendingUp}
          label="Ownership earned"
          value={summary.ownershipPercent}
          format={(value) => percent(value)}
          hint={`of ${percent(summary.agreedOwnershipPercent, 2)} agreed`}
          tone="violet"
        />
        <FinanceCard
          icon={CheckCircle2}
          label="Funding progress"
          value={summary.progressPercent}
          format={(value) => percent(value, 2)}
          tone="sky"
          progress={summary.progressPercent}
        />
      </div>

      {/* ----------------------------- commitments ---------------------------- */}
      {commitments.length > 0 && (
        <Section
          title="Commitments"
          description="Each commitment vests independently against its own agreed equity."
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
                      {humanize(commitment.investmentType)}
                    </p>
                  </div>
                  <Pill tone={commitment.isFullyFunded ? 'green' : 'amber'}>
                    {commitment.isFullyFunded ? 'Fully funded' : humanize(commitment.status)}
                  </Pill>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Received</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-white">
                      {inr(commitment.receivedTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Committed</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-white">
                      {inr(commitment.committedAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ownership now</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-violet-300">
                      {percent(commitment.ownershipPercent)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Agreed at full funding</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-white">
                      {percent(commitment.agreedOwnershipPercent, 2)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <ProgressBar
                    value={commitment.fundingProgressPercent}
                    showLabel
                    label="Funding progress"
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ------------------------------- payments ------------------------------ */}
      <Section
        title="Payments"
        description="Capital received against your commitments. Ownership earned per payment adds up to your total ownership."
      >
        {uncounted.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-200/90">
            <span className="font-semibold">
              {uncounted.length} record{uncounted.length === 1 ? '' : 's'} totalling{' '}
              {inr(data.uncountedTotal ?? 0)}
            </span>{' '}
            {uncounted.length === 1 ? 'is' : 'are'} not linked to a live commitment, so{' '}
            {uncounted.length === 1 ? 'it is' : 'they are'} excluded from the totals above
            and earn no ownership. Please contact us if you believe this is an error.
          </div>
        )}

        <FinanceTable<TimelineEntry>
          rows={entries}
          rowKey={(row) => row.investmentId}
          emptyTitle="No payments recorded yet"
          emptyMessage="Once your first capital payment is recorded, it will appear here with the ownership it earned."
          columns={[
            {
              key: 'date',
              header: 'Date',
              render: (row) => (
                <span className="whitespace-nowrap text-slate-300">{formatDate(row.date)}</span>
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
              key: 'commitment',
              header: 'Commitment',
              hideOnMobile: true,
              render: (row) => (
                <span className="text-slate-400">{row.commitmentTitle ?? 'Direct investment'}</span>
              ),
            },
            {
              key: 'cumulative',
              header: 'Total invested',
              numeric: true,
              hideOnMobile: true,
              render: (row) => (
                <span className="text-slate-300">{inr(row.cumulativeInvested)}</span>
              ),
            },
            {
              key: 'earned',
              header: 'Ownership earned',
              numeric: true,
              render: (row) => (
                <span className="font-semibold text-violet-300">
                  +{percent(row.ownershipEarned)}
                </span>
              ),
            },
            {
              key: 'running',
              header: 'Ownership after',
              numeric: true,
              hideOnMobile: true,
              render: (row) => (
                <span className="text-slate-300">{percent(row.cumulativeOwnership)}</span>
              ),
            },
            {
              key: 'progress',
              header: 'Progress',
              hideOnMobile: true,
              width: '140px',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <ProgressBar value={row.progressPercent} height={5} />
                  <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                    {percent(row.progressPercent, 1)}
                  </span>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              render: (row) => (
                <Pill tone="green">
                  <CheckCircle2 className="h-3 w-3" />
                  {humanize(row.status)}
                </Pill>
              ),
            },
            {
              key: 'invoice',
              header: 'Invoice / Bill',
              align: 'center',
              hideOnMobile: true,
              render: (row) => {
                const docs = row.documents ?? [];
                if (docs.length === 0) {
                  return row.hasInvoice ? (
                    <FileText
                      className="mx-auto h-4 w-4 text-brand-300"
                      aria-label="Invoice attached"
                    />
                  ) : (
                    <span className="text-slate-600">—</span>
                  );
                }
                return (
                  <div className="flex flex-col items-center gap-1">
                    {docs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            doc.kind === 'BILL' ? 'text-emerald-300' : 'text-brand-300'
                          }`}
                        >
                          {doc.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openPdf(doc.id)}
                          className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                          aria-label={`View ${doc.number}`}
                          title="View PDF"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void savePdf(doc.id, doc.number)}
                          className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                          aria-label={`Download ${doc.number}`}
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              },
            },
          ]}
          footer={
            <>
              <TotalCell numeric={false}>Total</TotalCell>
              <TotalCell>{inr(summary.totalInvested)}</TotalCell>
              <TotalCell numeric={false} hideOnMobile>
                <span />
              </TotalCell>
              <TotalCell hideOnMobile>{inr(summary.totalInvested)}</TotalCell>
              <TotalCell>
                <span className="text-violet-300">{percent(summary.ownershipPercent)}</span>
              </TotalCell>
              <TotalCell numeric={false} hideOnMobile>
                <span />
              </TotalCell>
              <TotalCell hideOnMobile>
                <span className="text-slate-400">
                  {percent(summary.progressPercent, 2)} funded
                </span>
              </TotalCell>
              <TotalCell numeric={false}>
                <span />
              </TotalCell>
              <TotalCell numeric={false} hideOnMobile>
                <span />
              </TotalCell>
            </>
          }
        />
      </Section>

      {/* --------------------------- invoices & bills -------------------------- */}
      <Section
        title="Invoices & Bills"
        description="Documents issued to you — invoices raised before a payment and the bills confirming money received. View or download any PDF."
      >
        <div className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {(
            [
              { value: 'INVOICE', label: 'Invoices' },
              { value: 'BILL', label: 'Payment bills' },
            ] as const
          ).map((tab) => {
            const active = docTab === tab.value;
            const count = (myDocs ?? []).filter((doc) => doc.kind === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setDocTab(tab.value)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    active ? 'bg-white/20 !text-white' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {docsLoading ? (
          <TableSkeleton />
        ) : (
          <FinanceTable<InvoiceRecord>
            rows={(myDocs ?? []).filter((doc) => doc.kind === docTab)}
            rowKey={(row) => row._id}
            emptyTitle={docTab === 'BILL' ? 'No payment bills yet' : 'No invoices yet'}
            emptyMessage={
              docTab === 'BILL'
                ? 'A payment bill is issued after a payment is received. Bills issued to you will appear here.'
                : 'Invoices raised to you before a payment will appear here.'
            }
            columns={[
              {
                key: 'number',
                header: 'Number',
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <Pill tone={row.kind === 'BILL' ? 'green' : 'blue'}>
                      {row.kind === 'BILL' ? 'Bill' : 'Invoice'}
                    </Pill>
                    <span className="font-mono text-xs font-semibold text-white">
                      {row.number}
                    </span>
                  </div>
                ),
              },
              {
                key: 'date',
                header: 'Date',
                render: (row) => (
                  <span className="whitespace-nowrap text-slate-300">
                    {formatDate(row.kind === 'BILL' ? (row.paidAt ?? row.issueDate) : row.issueDate)}
                  </span>
                ),
              },
              {
                key: 'description',
                header: 'Description',
                hideOnMobile: true,
                render: (row) => (
                  <span className="block max-w-[260px] truncate text-slate-400">
                    {row.lineItems[0]?.description ?? '—'}
                    {row.lineItems.length > 1 ? ` +${row.lineItems.length - 1} more` : ''}
                  </span>
                ),
              },
              {
                key: 'total',
                header: 'Amount',
                numeric: true,
                render: (row) => (
                  <span className="font-semibold text-white">{inr(row.total)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                align: 'center',
                hideOnMobile: true,
                render: (row) => (
                  <Pill
                    tone={
                      row.status === 'PAID' ? 'green' : row.status === 'CANCELLED' ? 'gray' : 'amber'
                    }
                  >
                    {humanize(row.status)}
                  </Pill>
                ),
              },
              {
                key: 'actions',
                header: 'PDF',
                align: 'center',
                render: (row) => (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => void openPdf(row._id)}
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label={`View ${row.number}`}
                      title="View PDF"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void savePdf(row._id, row.number)}
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Download ${row.number}`}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Section>
    </div>
  );
}
