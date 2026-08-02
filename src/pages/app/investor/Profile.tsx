import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  IdCard,
  Mail,
  PencilLine,
  Phone,
  PieChart,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill, Section, statusTone } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { useAuth } from '@/context/AuthContext';
import { getMyKyc } from '@/lib/kycApi';
import { getInvestorOverview, type InvestorOverview } from '@/lib/investorFinanceApi';
import type { KycRecord } from '@/types';
import { useInvestorData } from './useInvestorData';
import { formatDate, humanize, inr, percent } from '@/lib/format';

/**
 * ============================================================================
 *  14. INVESTOR PROFILE
 * ============================================================================
 *
 * Identity, verification status and investment summary in one place.
 *
 * Identity fields (PAN, Aadhaar, address, photo ID) are READ ONLY here and
 * sourced from the KYC record, because they are what the verification was
 * performed against. Letting them be edited on a profile page would let a
 * verified identity be quietly swapped after approval — so edits go through
 * the KYC flow, which re-verifies.
 * ============================================================================
 */

interface ProfileData {
  overview: InvestorOverview;
  kyc: KycRecord | null;
}

export default function InvestorProfile() {
  const { user } = useAuth();

  const { data, loading, error, reload } = useInvestorData<ProfileData>(
    async () => {
      const [overview, kyc] = await Promise.all([getInvestorOverview(), getMyKyc()]);
      return { overview, kyc };
    },
    [],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Account" title="Investor profile" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Account" title="Investor profile" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const { overview, kyc } = data;
  const isVerified = overview.investor.kycStatus === 'APPROVED';

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Investor profile"
        subtitle="Your details, verification status and investment summary."
        action={
          <Link to="/profile">
            <Button variant="secondary" size="sm">
              <PencilLine className="h-4 w-4" />
              Edit profile
            </Button>
          </Link>
        }
      />

      {/* -------------------------------- identity ------------------------------- */}
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar
            src={overview.investor.profileImage ?? user?.avatarUrl}
            name={overview.investor.name}
            className="h-16 w-16"
            textClassName="text-lg"
            rounded="rounded-2xl"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-white">
                {overview.investor.name}
              </h2>
              <Pill tone={statusTone(overview.investor.kycStatus)}>
                {isVerified && <BadgeCheck className="h-3 w-3" />}
                {humanize(overview.investor.kycStatus)}
              </Pill>
            </div>

            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Detail icon={Mail} label="Email" value={overview.investor.email} />
              <Detail icon={Phone} label="Phone" value={overview.investor.phone ?? '—'} />
              <Detail
                icon={CalendarClock}
                label="Investor since"
                value={formatDate(overview.investor.investorSince)}
              />
              <Detail
                icon={Building2}
                label="Instrument"
                value={overview.hasCommitment ? 'Equity investment' : '—'}
              />
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------ verification ----------------------------- */}
      <Section
        title="Verification"
        description="Identity details are held against your KYC submission and cannot be edited here."
        action={
          <Link to="/kyc">
            <Button variant="secondary" size="sm">
              <ShieldCheck className="h-4 w-4" />
              {kyc ? 'View verification' : 'Complete verification'}
            </Button>
          </Link>
        }
      >
        {!kyc ? (
          <InfoNote tone="warning" icon={ShieldCheck}>
            You have not submitted identity verification yet. Completing KYC is required
            before profit distributions can be paid out.
          </InfoNote>
        ) : (
          <div className="glass-card p-5">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
                icon={BadgeCheck}
                label="Status"
                value={humanize(kyc.status)}
              />
              <Detail
                icon={CalendarClock}
                label="Verified on"
                value={kyc.verifiedAt ? formatDate(kyc.verifiedAt) : '—'}
              />
            </dl>

            {kyc.status === 'REJECTED' && kyc.rejectionReason && (
              <div className="mt-4">
                <InfoNote tone="warning">
                  Verification was not accepted: {kyc.rejectionReason}
                </InfoNote>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* --------------------------- investment summary -------------------------- */}
      <Section title="Investment summary" description="Your position at a glance.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <FinanceCard
            icon={BadgeCheck}
            label="Profit received"
            value={overview.totalProfitReceived}
            format={inr}
            hint={
              overview.lastPaidAt ? `Last paid ${formatDate(overview.lastPaidAt)}` : 'No payouts yet'
            }
            tone="amber"
          />
        </div>
      </Section>
    </div>
  );
}

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
