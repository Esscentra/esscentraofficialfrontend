import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarClock,
  IdCard,
  PieChart,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { getMyKyc } from '@/lib/kycApi';
import { getInvestorOverview, type InvestorOverview } from '@/lib/investorFinanceApi';
import type { KycRecord } from '@/types';
import { formatDate, humanize, inr, percent } from '@/lib/format';

/**
 * ============================================================================
 *  INVESTOR SUMMARY — the investor-specific half of the profile page
 * ============================================================================
 *
 * Everything an investor's profile needs that a general profile does not: what
 * their KYC was verified against, and where their investment position stands.
 *
 * What this deliberately does NOT render, because the profile page already
 * does and two copies of a figure is how they end up disagreeing:
 *
 *   - name, avatar, email, phone ...... the profile header and edit form;
 *   - KYC status and the verify CTA ... the KYC banner directly above;
 *   - profit received to date ......... the earnings panel, which shows it
 *                                       as "already paid out".
 *
 * Identity fields are READ ONLY here and sourced from the KYC record, because
 * they are what the verification was performed against. Letting them be edited
 * on a profile page would let a verified identity be quietly swapped after
 * approval, so edits go through the KYC flow, which re-verifies.
 *
 * Renders nothing for an account with no investor position, which is what
 * keeps it safe to mount on the shared profile page for every role.
 * ============================================================================
 */

interface Data {
  overview: InvestorOverview;
  kyc: KycRecord | null;
}

export function InvestorSummary({ className = '' }: { className?: string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;

    Promise.all([getInvestorOverview(), getMyKyc().catch(() => null)])
      .then(([overview, kyc]) => {
        if (alive) setData({ overview, kyc });
      })
      // A non-investor gets a 403 here. That is expected, not an error worth
      // showing — the section simply does not apply to them.
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  const { overview, kyc } = data;
  if (!overview.hasCommitment && !kyc) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ------------------------------ verification ---------------------------- */}
      {kyc && (
        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Verified identity</h3>
              <p className="mt-0.5 text-sm text-slate-400">
                Held against your KYC submission and not editable here.
              </p>
            </div>
            <Link to="/kyc" className="shrink-0">
              <Button variant="secondary" size="sm">
                <ShieldCheck className="h-4 w-4" />
                View verification
              </Button>
            </Link>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail icon={IdCard} label="Legal name" value={kyc.fullName} />
            <Detail
              icon={IdCard}
              label="Document type"
              value={humanize(kyc.documentType)}
            />
            <Detail
              icon={IdCard}
              label="Document number"
              // Masked: the full number lives on the KYC record and is not
              // needed to confirm which document was verified.
              value={maskDocument(kyc.documentNumber)}
            />
            <Detail
              icon={CalendarClock}
              label="Date of birth"
              value={formatDate(kyc.dateOfBirth)}
            />
            <Detail
              icon={CalendarClock}
              label="Verified on"
              value={kyc.verifiedAt ? formatDate(kyc.verifiedAt) : '—'}
            />
            <Detail
              icon={CalendarClock}
              label="Investor since"
              value={formatDate(overview.investor.investorSince)}
            />
          </dl>

          {kyc.status === 'REJECTED' && kyc.rejectionReason && (
            <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              Verification was not accepted: {kyc.rejectionReason}
            </p>
          )}
        </section>
      )}

      {/* --------------------------- investment position ------------------------ */}
      {overview.hasCommitment && (
        <section>
          <h3 className="mb-3 font-semibold text-white">Investment position</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FinanceCard
              icon={Wallet}
              label="Capital paid in"
              value={overview.investmentReceived}
              format={inr}
              hint={`of ${inr(overview.committedInvestment)} committed`}
              tone="brand"
              progress={overview.investmentProgressPercent}
            />
            <FinanceCard
              icon={PieChart}
              label="Ownership"
              value={overview.currentOwnershipPercent}
              format={(value) => percent(value)}
              hint={`toward ${percent(overview.agreedOwnershipPercent, 2)}`}
              tone="violet"
            />
            <FinanceCard
              icon={Building2}
              label="Share value"
              value={overview.investorShareValue}
              format={inr}
              hint="At the current valuation"
              tone="green"
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* --------------------------------- bits ----------------------------------- */

/** Show only the last four characters of an identity document number. */
function maskDocument(value?: string): string {
  if (!value) return '—';
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${'•'.repeat(Math.min(8, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm text-slate-200">{value}</dd>
    </div>
  );
}
