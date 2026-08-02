import { useState } from 'react';
import { CheckCircle2, Clock, Download, HandCoins, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import { Pill, Section, statusTone } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import {
  downloadDistributionReceipt,
  getMyPaymentHistory,
  type DistributionRecord,
  type PaymentHistory as PaymentHistoryData,
} from '@/lib/financeApi';
import { useInvestorData } from './useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { formatDate, humanize, inr, inrExact, percent } from '@/lib/format';

/**
 * ============================================================================
 *  11. PAYMENT HISTORY
 * ============================================================================
 *
 * Every payment made to the investor, with its reference number and receipt.
 *
 * Only APPROVED, PAID and CANCELLED records reach this page. A DRAFT
 * distribution is internal working — showing it would promise money that has
 * not been declared, which is worse than showing nothing.
 * ============================================================================
 */

export default function InvestorPaymentHistory() {
  const toast = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, loading, error, reload } = useInvestorData<PaymentHistoryData>(
    () => getMyPaymentHistory(),
    [],
  );

  const download = async (row: DistributionRecord) => {
    setDownloading(row._id);
    try {
      await downloadDistributionReceipt(
        row._id,
        row.receipt?.originalName ?? `receipt-${row.periodKey ?? row._id}.pdf`,
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
        eyebrow="Distributions"
        title="Payment history"
        subtitle="Every profit share and payout made to you, with references and receipts."
      />

      {loading ? (
        <>
          <CardGridSkeleton count={3} />
          <TableSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FinanceCard
              icon={HandCoins}
              label="Total received"
              value={data.totals.totalPaid}
              format={inr}
              hint={`${data.totals.paidCount} payment${
                data.totals.paidCount === 1 ? '' : 's'
              }`}
              tone="green"
            />
            <FinanceCard
              icon={Clock}
              label="Approved, awaiting payment"
              value={data.totals.totalApproved}
              format={inr}
              hint={`${data.totals.pendingCount} declared`}
              tone="amber"
            />
            <FinanceCard
              icon={CheckCircle2}
              label="Last payment"
              value={data.totals.lastPaidAt ? formatDate(data.totals.lastPaidAt) : '—'}
              hint={data.totals.lastPaidAt ? 'Most recent settlement' : 'No payments yet'}
              tone="sky"
            />
          </div>

          <Section
            title="Payments"
            description="A declaration becomes a payment once the transfer is made and referenced."
          >
            <FinanceTable<DistributionRecord>
              rows={data.rows}
              rowKey={(row) => row._id}
              emptyTitle="No payments yet"
              emptyMessage="Profit distributions will appear here once they have been approved by the admin team."
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  render: (row) => (
                    <span className="whitespace-nowrap text-slate-300">
                      {formatDate(row.paidAt ?? row.approvedAt ?? row.createdAt)}
                    </span>
                  ),
                },
                {
                  key: 'period',
                  header: 'Period',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-slate-400">{row.periodLabel ?? '—'}</span>
                  ),
                },
                {
                  key: 'reason',
                  header: 'Reason',
                  render: (row) => (
                    <div className="min-w-0">
                      <p className="truncate text-slate-200">
                        {row.reason ?? humanize(row.type)}
                      </p>
                      {row.type !== 'PROFIT_SHARE' && (
                        <p className="text-xs text-slate-500">{humanize(row.type)}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'ownership',
                  header: 'Ownership',
                  numeric: true,
                  hideOnMobile: true,
                  render: (row) =>
                    row.type === 'PROFIT_SHARE' ? (
                      <span
                        className="text-violet-300"
                        title="Your ownership at the close of the period"
                      >
                        {percent(row.ownershipPercent)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  numeric: true,
                  render: (row) => (
                    <span className="font-semibold text-white">
                      {inrExact(row.investorProfit)}
                    </span>
                  ),
                },
                {
                  key: 'reference',
                  header: 'Reference',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="font-mono text-xs text-slate-400">
                      {row.referenceNumber ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  render: (row) => (
                    <Pill tone={statusTone(row.status)}>{humanize(row.status)}</Pill>
                  ),
                },
                {
                  key: 'receipt',
                  header: 'Receipt',
                  align: 'center',
                  render: (row) =>
                    row.receipt?.url ? (
                      <button
                        type="button"
                        onClick={() => void download(row)}
                        disabled={downloading === row._id}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/10 hover:text-brand-200 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloading === row._id ? 'Saving…' : 'Download'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <Receipt className="h-3.5 w-3.5" />
                        None
                      </span>
                    ),
                },
              ]}
              footer={
                <>
                  <TotalCell numeric={false}>Total received</TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell numeric={false}>
                    <span />
                  </TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell>{inr(data.totals.totalPaid)}</TotalCell>
                  <TotalCell numeric={false} hideOnMobile>
                    <span />
                  </TotalCell>
                  <TotalCell numeric={false} colSpan={2}>
                    <span />
                  </TotalCell>
                </>
              }
            />
          </Section>
        </>
      )}
    </div>
  );
}
