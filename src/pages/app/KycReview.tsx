import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, Check, Search, ShieldCheck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { initials } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils';
import { approveKyc, listAllKyc, rejectKyc } from '@/lib/kycApi';
import type { KycStatus, KycSubmission } from '@/types';

const STATUS_TONE: Record<string, Tone> = {
  APPROVED: 'green',
  UNDER_REVIEW: 'sky',
  PENDING: 'amber',
  REJECTED: 'red',
  NOT_SUBMITTED: 'gray',
};

const FILTERS: { value: 'ALL' | KycStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function KycReviewPage() {
  const toast = useToast();

  const [items, setItems] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | KycStatus>('ALL');

  const [active, setActive] = useState<KycSubmission | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ------------------------------- Load data ------------------------------- */
  useEffect(() => {
    let on = true;
    setLoading(true);
    listAllKyc()
      .then((data) => on && setItems(data))
      .catch((e) => on && toast.error('Could not load KYC', getErrorMessage(e, 'Admin access required.')))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

  /* ------------------------------- Filtering ------------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((k) => {
      const matchesQuery =
        !q ||
        k.fullName.toLowerCase().includes(q) ||
        (k.user?.email ?? '').toLowerCase().includes(q) ||
        k.documentNumber.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || k.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const pendingCount = useMemo(
    () => items.filter((k) => k.status === 'PENDING' || k.status === 'UNDER_REVIEW').length,
    [items],
  );

  /* ------------------------------ Approve / reject ------------------------------ */
  const apply = (updated: KycSubmission) =>
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));

  const onApprove = async (k: KycSubmission) => {
    setBusy(true);
    try {
      apply(await approveKyc(k.id));
      setActive(null);
      toast.success('KYC approved', k.fullName);
    } catch (e) {
      toast.error('Approve failed', getErrorMessage(e, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!active) return;
    const reason = String(new FormData(e.currentTarget).get('reason') ?? '').trim();
    if (!reason) return;

    setBusy(true);
    try {
      apply(await rejectKyc(active.id, reason));
      setRejecting(false);
      setActive(null);
      toast.info('KYC rejected', active.fullName);
    } catch (err) {
      toast.error('Reject failed', getErrorMessage(err, 'Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------- Columns -------------------------------- */
  const columns: Column<KycSubmission>[] = [
    {
      key: 'user',
      header: 'User',
      render: (k) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white ring-1 ring-white/20">
            {initials(k.user?.name ?? k.fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{k.user?.name ?? k.fullName}</p>
            <p className="truncate text-xs text-slate-400">{k.user?.email ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'documentType', header: 'Document', render: (k) => humanize(k.documentType) },
    { key: 'documentNumber', header: 'Number', render: (k) => k.documentNumber },
    {
      key: 'status',
      header: 'Status',
      render: (k) => <StatusBadge tone={STATUS_TONE[k.status] ?? 'gray'}>{humanize(k.status)}</StatusBadge>,
    },
    { key: 'createdAt', header: 'Submitted', render: (k) => fmtDate(k.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (k) => (
        <Button size="sm" variant="secondary" onClick={() => { setActive(k); setRejecting(false); }}>
          Review
        </Button>
      ),
    },
  ];

  const canDecide = active && (active.status === 'PENDING' || active.status === 'UNDER_REVIEW');

  return (
    <div>
      <PageHeader
        title="KYC Verification"
        subtitle={`Review identity submissions from users.${pendingCount ? ` ${pendingCount} awaiting review.` : ''}`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label=""
            icon={<Search />}
            placeholder="Search by name, email or document number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | KycStatus)}
            options={FILTERS}
          />
        </div>
      </div>

      {loading ? (
        <LoadingCard label="Loading submissions…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title={items.length === 0 ? 'No submissions yet' : 'No matches'}
          description={
            items.length === 0
              ? 'When users submit KYC documents, they’ll appear here for review.'
              : 'Try a different search or status filter.'
          }
        />
      ) : (
        <>
          <DataTable columns={columns} rows={filtered} />
          <p className="mt-3 text-xs text-slate-500">
            Showing {filtered.length} of {items.length} submissions
          </p>
        </>
      )}

      {/* Review modal */}
      <Modal open={!!active} onClose={() => setActive(null)} title="KYC submission">
        {active && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{active.fullName}</p>
                <p className="truncate text-xs text-slate-400">{active.user?.email ?? '—'}</p>
              </div>
              <StatusBadge tone={STATUS_TONE[active.status] ?? 'gray'}>{humanize(active.status)}</StatusBadge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Document</dt>
                <dd className="text-slate-200">{humanize(active.documentType)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Number</dt>
                <dd className="text-slate-200">{active.documentNumber}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Date of birth</dt>
                <dd className="text-slate-200">{fmtDate(active.dateOfBirth)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Submitted</dt>
                <dd className="text-slate-200">{fmtDate(active.createdAt)}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-3 gap-3">
              {([
                ['Front', active.frontImageUrl],
                ['Back', active.backImageUrl],
                ['Selfie', active.selfieUrl],
              ] as const).map(([label, url]) => (
                <a
                  key={label}
                  href={url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`group relative overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/10 ${
                    url ? '' : 'pointer-events-none opacity-40'
                  }`}
                >
                  {url ? (
                    <img src={url} alt={label} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center text-[11px] text-slate-500">
                      None
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] text-slate-200">
                    {label}
                  </span>
                </a>
              ))}
            </div>

            {active.status === 'REJECTED' && active.rejectionReason && (
              <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
                Rejected: {active.rejectionReason}
              </p>
            )}
            {active.verifiedByName && active.status !== 'PENDING' && (
              <p className="text-xs text-slate-500">
                Reviewed by {active.verifiedByName} on {fmtDate(active.verifiedAt)}
              </p>
            )}

            {/* Reject reason form */}
            {rejecting ? (
              <form onSubmit={onReject} className="space-y-3 border-t border-white/10 pt-4">
                <Textarea
                  label="Rejection reason"
                  name="reason"
                  required
                  placeholder="Explain why this submission was rejected…"
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setRejecting(false)}>
                    Back
                  </Button>
                  <Button type="submit" variant="danger" disabled={busy}>
                    {busy ? 'Rejecting…' : 'Confirm reject'}
                  </Button>
                </div>
              </form>
            ) : canDecide ? (
              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <Button type="button" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button type="button" disabled={busy} onClick={() => onApprove(active)}>
                  <Check className="h-4 w-4" /> {busy ? 'Approving…' : 'Approve'}
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4" /> This submission has already been {humanize(active.status)}.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
