import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, Check, FileX2, Search, ShieldCheck, X } from 'lucide-react';
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
import { Avatar } from '@/components/ui/Avatar';
import { getErrorMessage } from '@/lib/utils';
import { approveKyc, listAllKyc, rejectKyc } from '@/lib/kycApi';
import { listUsers } from '@/lib/adminApi';
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
  // userId → profile image, so we can show the user's avatar (the KYC payload
  // only carries id/name/email). Populated from the admin users list.
  const [avatarById, setAvatarById] = useState<Record<string, string>>({});
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
    // Users list is best-effort — KYC still loads if it fails.
    Promise.all([listAllKyc(), listUsers().catch(() => [])])
      .then(([data, users]) => {
        if (!on) return;
        setItems(data);
        const map: Record<string, string> = {};
        users.forEach((u) => {
          if (u.avatarUrl) map[u.id] = u.avatarUrl;
        });
        setAvatarById(map);
      })
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
      render: (k) => {
        const avatar = k.user?.id ? avatarById[k.user.id] : undefined;
        const name = k.user?.name ?? k.fullName;
        return (
          <div className="flex items-center gap-3">
            <Avatar src={avatar} name={name} />
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{name}</p>
              <p className="truncate text-xs text-slate-400">{k.user?.email ?? '—'}</p>
            </div>
          </div>
        );
      },
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
      key: 'reviewedBy',
      header: 'Reviewed by',
      render: (k) => {
        const decided = k.status === 'APPROVED' || k.status === 'REJECTED';
        if (!decided) return <span className="text-xs text-slate-500">Awaiting review</span>;
        if (!k.verifiedByName) return <span className="text-slate-500">—</span>;
        return (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-slate-200">
              <BadgeCheck
                className={`h-3.5 w-3.5 shrink-0 ${
                  k.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              />
              {k.verifiedByName}
            </p>
            <p className="truncate text-xs text-slate-500">{fmtDate(k.verifiedAt)}</p>
          </div>
        );
      },
    },
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
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={active.user?.id ? avatarById[active.user.id] : undefined}
                  name={active.user?.name ?? active.fullName}
                  className="h-12 w-12"
                  textClassName="text-sm"
                  rounded="rounded-2xl"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{active.fullName}</p>
                  <p className="truncate text-xs text-slate-400">{active.user?.email ?? '—'}</p>
                </div>
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
                ['Front', active.frontImageUrl, active.frontImageUnavailable],
                ['Back', active.backImageUrl, active.backImageUnavailable],
                ['Selfie', active.selfieUrl, active.selfieUnavailable],
              ] as const).map(([label, url, unavailable]) => {
                // A submitted-but-unreachable document is NOT the same as one
                // that was never submitted — a reviewer must be able to tell
                // them apart before approving or rejecting.
                const openable = !!url && !unavailable;
                return (
                  <a
                    key={label}
                    href={openable ? url : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`group relative overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/10 ${
                      openable ? '' : 'pointer-events-none'
                    } ${!url ? 'opacity-40' : ''}`}
                  >
                    {openable ? (
                      <img src={url} alt={label} className="aspect-[4/3] w-full object-cover" />
                    ) : url ? (
                      <div className="grid aspect-[4/3] place-items-center gap-1 bg-amber-500/[0.07] px-2 text-center ring-1 ring-inset ring-amber-400/25">
                        <FileX2 className="mx-auto h-4 w-4 text-amber-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                          Unavailable
                        </span>
                        <span className="text-[9px] leading-tight text-amber-200/70">
                          Submitted, file no longer stored
                        </span>
                      </div>
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center text-[11px] text-slate-500">
                        None
                      </div>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] text-slate-200">
                      {label}
                    </span>
                  </a>
                );
              })}
            </div>

            {active.status === 'APPROVED' && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/30">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-emerald-200">
                    Approved{active.verifiedByName ? ` by ${active.verifiedByName}` : ''}
                  </p>
                  {active.verifiedAt && (
                    <p className="text-xs text-emerald-200/70">on {fmtDate(active.verifiedAt)}</p>
                  )}
                </div>
              </div>
            )}

            {active.status === 'REJECTED' && (
              <div className="rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-500/30">
                {active.rejectionReason && (
                  <p className="text-sm text-rose-300">
                    <span className="font-semibold">Rejected:</span> {active.rejectionReason}
                  </p>
                )}
                {active.verifiedByName && (
                  <p className="mt-1 text-xs text-rose-200/70">
                    By {active.verifiedByName}
                    {active.verifiedAt ? ` on ${fmtDate(active.verifiedAt)}` : ''}
                  </p>
                )}
              </div>
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
