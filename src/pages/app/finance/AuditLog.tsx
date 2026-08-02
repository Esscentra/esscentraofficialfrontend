import { useState } from 'react';
import {
  Building2,
  FileText,
  History,
  IndianRupee,
  ScrollText,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Pill, SelectControl } from '@/components/finance/Controls';
import { ErrorState, InfoNote, TableSkeleton } from '@/components/finance/States';
import { listAuditLog, type AuditEntry, type AuditListResult } from '@/lib/financeApi';
import { useInvestorData } from '../investor/useInvestorData';
import { formatDateTime, humanize, inr, relativeTime } from '@/lib/format';

/**
 * ============================================================================
 *  ADMIN — AUDIT TRAIL
 * ============================================================================
 *
 * Who changed what, when, and what the values were before and after.
 *
 * The trail is append-only and nothing in the product writes to it except the
 * audit service, so it can be trusted as evidence rather than treated as a
 * convenience log. Actor names are stored on the entry rather than joined at
 * read time — the record has to survive the account being renamed or deleted.
 * ============================================================================
 */

const ENTITY_META: Record<string, { icon: LucideIcon; label: string; tone: 'blue' | 'green' | 'violet' | 'amber' | 'teal' | 'red' }> = {
  REVENUE: { icon: IndianRupee, label: 'Revenue', tone: 'green' },
  BUSINESS_EXPENSE: { icon: Wallet, label: 'Expense', tone: 'red' },
  VALUATION: { icon: Building2, label: 'Valuation', tone: 'violet' },
  INVESTMENT: { icon: Wallet, label: 'Investment', tone: 'blue' },
  COMMITMENT: { icon: ScrollText, label: 'Commitment', tone: 'amber' },
  COMMITMENT_EXPENSE: { icon: Wallet, label: 'Fund usage', tone: 'amber' },
  PROFIT_DISTRIBUTION: { icon: IndianRupee, label: 'Distribution', tone: 'teal' },
  INVESTOR_DOCUMENT: { icon: FileText, label: 'Document', tone: 'blue' },
};

const ACTION_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'teal'> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  APPROVE: 'green',
  REJECT: 'amber',
  PAY: 'teal',
  CANCEL: 'amber',
  UPLOAD: 'blue',
};

/** Render a diff value compactly — dates, money and objects all read badly raw. */
function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // ISO timestamps are unreadable in a diff; everything else passes through.
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
    return value.length > 60 ? `${value.slice(0, 57)}…` : value;
  }
  return JSON.stringify(value).slice(0, 60);
}

export default function AuditLog() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, loading, error, reload } = useInvestorData<AuditListResult>(
    () =>
      listAuditLog({
        entity: entity || undefined,
        action: action || undefined,
        page,
        limit: 50,
      }),
    [entity, action, page],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        subtitle="Every financial change, with who made it and what it changed."
      />

      <InfoNote tone="neutral" icon={History}>
        This trail is append-only. Entries are never edited or removed, and the actor is
        recorded as they were at the time — so it stays evidential even after an account
        is renamed or removed.
      </InfoNote>

      <div className="glass-card flex flex-wrap items-end gap-3 p-4">
        <SelectControl
          label="Record type"
          value={entity}
          onChange={(value) => {
            setEntity(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All records' },
            ...Object.entries(ENTITY_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            })),
          ]}
        />
        <SelectControl
          label="Action"
          value={action}
          onChange={(value) => {
            setAction(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All actions' },
            ...Object.keys(ACTION_TONE).map((value) => ({ value, label: humanize(value) })),
          ]}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : data.entries.length === 0 ? (
        <InfoNote tone="neutral">
          No audit entries match these filters yet.
        </InfoNote>
      ) : (
        <>
          <ul className="space-y-2">
            {data.entries.map((entry: AuditEntry) => {
              const meta = ENTITY_META[entry.entity] ?? {
                icon: History,
                label: entry.entity,
                tone: 'blue' as const,
              };
              const Icon = meta.icon;
              const isOpen = expanded === entry._id;
              const hasChanges = entry.changes?.length > 0;

              return (
                <li key={entry._id} className="glass-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : entry._id)}
                    disabled={!hasChanges}
                    className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-white/[0.03] disabled:cursor-default"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={ACTION_TONE[entry.action] ?? 'gray'}>
                          {humanize(entry.action)}
                        </Pill>
                        <Pill tone="gray">{meta.label}</Pill>
                        {entry.amount !== undefined && entry.amount > 0 && (
                          <span className="text-xs font-semibold tabular-nums text-slate-300">
                            {inr(entry.amount)}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-slate-200">
                        {entry.description}
                      </p>

                      <p className="mt-1.5 text-xs text-slate-500">
                        {entry.actorName ?? 'System'}
                        {entry.actorRole ? ` · ${humanize(entry.actorRole)}` : ''} ·{' '}
                        <span title={formatDateTime(entry.createdAt)}>
                          {relativeTime(entry.createdAt)}
                        </span>
                        {hasChanges && (
                          <>
                            {' · '}
                            <span className="text-brand-300">
                              {entry.changes.length} field
                              {entry.changes.length === 1 ? '' : 's'} changed
                              {isOpen ? ' ▲' : ' ▼'}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </button>

                  {isOpen && hasChanges && (
                    <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                            <th className="py-1.5 pr-4 font-semibold">Field</th>
                            <th className="py-1.5 pr-4 font-semibold">Before</th>
                            <th className="py-1.5 font-semibold">After</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.changes.map((change) => (
                            <tr key={change.field} className="border-t border-white/5">
                              <td className="py-2 pr-4 font-mono text-slate-400">
                                {change.field}
                              </td>
                              <td className="py-2 pr-4 text-rose-300/80">
                                {formatDiffValue(change.from)}
                              </td>
                              <td className="py-2 text-emerald-300/90">
                                {formatDiffValue(change.to)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {data.pages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Page {data.page} of {data.pages} · {data.total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.pages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
