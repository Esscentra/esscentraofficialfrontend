import { useState } from 'react';
import { BarChart3, HandCoins, IndianRupee, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import { ExportButtons, SelectControl, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ChartSkeleton, ErrorState } from '@/components/finance/States';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { SERIES } from '@/components/charts/chartTheme';
import { useToast } from '@/components/ui/Toast';
import {
  downloadMonthlyReport,
  getMonthlySeries,
  type MonthlyPoint,
  type MonthlySeries,
} from '@/lib/investorFinanceApi';
import { useInvestorData } from './useInvestorData';
import { getErrorMessage } from '@/lib/utils';
import { inr, inrCompact, percent } from '@/lib/format';

/**
 * ============================================================================
 *  7. MONTHLY REPORTS
 * ============================================================================
 *
 * Every chart the spec asks for — bar, area, line, pie — over a selectable
 * window, plus the underlying table and the exports.
 *
 * PDF export goes through the browser's print dialogue against the print
 * stylesheet rather than a server-rendered template. That guarantees the
 * saved document is exactly what the investor was looking at; a separate
 * template is a second source of truth that drifts.
 * ============================================================================
 */

const MONTH_OPTIONS = [
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
  { value: '36', label: 'Last 36 months' },
];

export default function InvestorReports() {
  const toast = useToast();
  const [months, setMonths] = useState('12');
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useInvestorData<MonthlySeries>(
    () => getMonthlySeries(Number(months)),
    [months],
  );

  const points = data?.points ?? [];
  const labels = points.map((point) => point.label.split(' ')[0] ?? point.label);

  const download = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      await downloadMonthlyReport(format, Number(months));
      toast.success('Report downloaded', `Your ${format.toUpperCase()} report is ready.`);
    } catch (thrown) {
      toast.error('Export failed', getErrorMessage(thrown));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Reporting"
        title="Monthly reports"
        subtitle="Company performance and your position, month by month."
        action={
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <SelectControl
              label="Window"
              value={months}
              onChange={setMonths}
              options={MONTH_OPTIONS}
            />
            <ExportButtons
              busy={exporting}
              onCsv={() => void download('csv')}
              onExcel={() => void download('excel')}
              onPdf={() => window.print()}
            />
          </div>
        }
      />

      {loading ? (
        <>
          <CardGridSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={IndianRupee}
              label={`Revenue · ${months} months`}
              value={data.totals.revenue}
              format={inr}
              tone="brand"
            />
            <FinanceCard
              icon={TrendingDown}
              label="Expenses"
              value={data.totals.expenses}
              format={inr}
              tone="rose"
            />
            <FinanceCard
              icon={TrendingUp}
              label="Net profit"
              value={data.totals.netProfit}
              format={inr}
              tone={data.totals.netProfit >= 0 ? 'green' : 'rose'}
            />
            <FinanceCard
              icon={HandCoins}
              label="Your profit share"
              value={data.totals.investorProfit}
              format={inr}
              hint={`at ${percent(data.totals.currentOwnershipPercent)} today`}
              tone="violet"
            />
          </div>

          {/* --------------------------- 1. Bar chart --------------------------- */}
          <ChartFrame
            title="Revenue vs expenses"
            subtitle="Bar chart — monthly comparison"
            isEmpty={points.every((point) => point.revenue === 0 && point.expenses === 0)}
            legend={[
              { label: 'Revenue', color: SERIES.revenue, value: inrCompact(data.totals.revenue) },
              { label: 'Expenses', color: SERIES.expenses, value: inrCompact(data.totals.expenses) },
            ]}
          >
            <BarChart
              categories={labels}
              series={[
                {
                  key: 'revenue',
                  label: 'Revenue',
                  color: SERIES.revenue,
                  values: points.map((point) => point.revenue),
                },
                {
                  key: 'expenses',
                  label: 'Expenses',
                  color: SERIES.expenses,
                  values: points.map((point) => point.expenses),
                },
              ]}
            />
          </ChartFrame>

          {/* --------------------------- 2. Area chart -------------------------- */}
          <ChartFrame
            title="Net profit trend"
            subtitle="Area chart — the line dips below zero in a loss-making month"
            isEmpty={points.every((point) => point.netProfit === 0)}
            legend={[{ label: 'Net profit', color: SERIES.netProfit }]}
          >
            <LineChart
              categories={labels}
              series={[
                {
                  key: 'net',
                  label: 'Net profit',
                  color: SERIES.netProfit,
                  values: points.map((point) => point.netProfit),
                  area: true,
                },
              ]}
            />
          </ChartFrame>

          <div className="grid gap-5 xl:grid-cols-5">
            {/* -------------------------- 3. Line chart ------------------------- */}
            <ChartFrame
              title="Your profit share"
              subtitle="Line chart — modelled share vs what was actually distributed"
              isEmpty={points.every(
                (point) => point.investorProfit === 0 && point.distributedProfit === 0,
              )}
              className="xl:col-span-3"
              legend={[
                { label: 'Modelled share', color: SERIES.investorProfit },
                { label: 'Distributed', color: SERIES.distributed },
              ]}
            >
              <LineChart
                categories={labels}
                series={[
                  {
                    key: 'modelled',
                    label: 'Modelled share',
                    color: SERIES.investorProfit,
                    values: points.map((point) => point.investorProfit),
                  },
                  {
                    key: 'distributed',
                    label: 'Distributed',
                    color: SERIES.distributed,
                    values: points.map((point) => point.distributedProfit),
                    dashed: true,
                  },
                ]}
              />
            </ChartFrame>

            {/* -------------------------- 4. Pie chart -------------------------- */}
            <ChartFrame
              title="Where the money went"
              subtitle="Pie chart — cumulative split over the window"
              isEmpty={data.totals.revenue === 0}
              className="xl:col-span-2"
            >
              <DonutChart
                slices={[
                  { label: 'Expenses', value: data.totals.expenses, color: SERIES.expenses },
                  {
                    label: 'Your share',
                    value: Math.max(0, data.totals.investorProfit),
                    color: SERIES.investorProfit,
                  },
                  {
                    label: 'Founder profit',
                    value: Math.max(0, data.totals.founderProfit),
                    color: SERIES.founderProfit,
                  },
                ]}
                formatValue={inr}
                centerLabel="Revenue"
              />
            </ChartFrame>
          </div>

          {/* ------------------------ 5. Investment received ------------------------ */}
          {data.totals.investmentReceived > 0 && (
            <ChartFrame
              title="Capital you paid in"
              subtitle="Investment received per month"
              isEmpty={points.every((point) => point.investmentReceived === 0)}
              legend={[
                {
                  label: 'Investment',
                  color: SERIES.investment,
                  value: inrCompact(data.totals.investmentReceived),
                },
              ]}
            >
              <BarChart
                categories={labels}
                series={[
                  {
                    key: 'investment',
                    label: 'Investment',
                    color: SERIES.investment,
                    values: points.map((point) => point.investmentReceived),
                  },
                ]}
              />
            </ChartFrame>
          )}

          {/* ------------------------------ the table ------------------------------ */}
          <Section
            title="Monthly breakdown"
            description="The figures behind every chart on this page."
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <BarChart3 className="h-3.5 w-3.5" />
                {points.length} months
              </span>
            }
          >
            <FinanceTable<MonthlyPoint>
              rows={points}
              rowKey={(row) => row.key}
              emptyTitle="No months to report"
              columns={[
                {
                  key: 'month',
                  header: 'Month',
                  render: (row) => (
                    <span className="whitespace-nowrap font-medium text-white">{row.label}</span>
                  ),
                },
                {
                  key: 'revenue',
                  header: 'Revenue',
                  numeric: true,
                  render: (row) => <span className="text-slate-200">{inr(row.revenue)}</span>,
                },
                {
                  key: 'expenses',
                  header: 'Expenses',
                  numeric: true,
                  render: (row) => <span className="text-rose-300">{inr(row.expenses)}</span>,
                },
                {
                  key: 'net',
                  header: 'Net profit',
                  numeric: true,
                  render: (row) => (
                    <span
                      className={`font-semibold ${
                        row.netProfit < 0 ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {inr(row.netProfit)}
                    </span>
                  ),
                },
                {
                  key: 'ownership',
                  header: 'Ownership',
                  numeric: true,
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-violet-300">{percent(row.ownershipPercent)}</span>
                  ),
                },
                {
                  key: 'share',
                  header: 'Your share',
                  numeric: true,
                  render: (row) => (
                    <span className="font-semibold text-white">{inr(row.investorProfit)}</span>
                  ),
                },
                {
                  key: 'distributed',
                  header: 'Distributed',
                  numeric: true,
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-teal-300">{inr(row.distributedProfit)}</span>
                  ),
                },
                {
                  key: 'invested',
                  header: 'You invested',
                  numeric: true,
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-amber-300">
                      {row.investmentReceived > 0 ? inr(row.investmentReceived) : '—'}
                    </span>
                  ),
                },
              ]}
              footer={
                <>
                  <TotalCell numeric={false}>Total</TotalCell>
                  <TotalCell>{inr(data.totals.revenue)}</TotalCell>
                  <TotalCell>{inr(data.totals.expenses)}</TotalCell>
                  <TotalCell>{inr(data.totals.netProfit)}</TotalCell>
                  <TotalCell hideOnMobile>—</TotalCell>
                  <TotalCell>{inr(data.totals.investorProfit)}</TotalCell>
                  <TotalCell hideOnMobile>{inr(data.totals.distributedProfit)}</TotalCell>
                  <TotalCell hideOnMobile>{inr(data.totals.investmentReceived)}</TotalCell>
                </>
              }
            />
          </Section>
        </>
      )}
    </div>
  );
}
