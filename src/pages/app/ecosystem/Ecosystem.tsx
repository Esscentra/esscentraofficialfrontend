import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Boxes,
  Coins,
  ExternalLink,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, Section } from '@/components/finance/Controls';
import {
  CardGridSkeleton,
  ErrorState,
  InfoNote,
} from '@/components/finance/States';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  addPlatformRevenue,
  createPlatform,
  deletePlatform,
  deletePlatformRevenue,
  getEcosystemOverview,
  getEcosystemPlatform,
  updateParentShares,
  updatePlatform,
  updatePlatformRevenue,
  PLATFORM_STATUSES,
  type EcosystemOverview,
  type EcosystemPlatformRow,
  type PlatformDetail,
  type PlatformRevenueEntry,
  type PlatformStatus,
  type ShareLine,
} from '@/lib/ecosystemApi';
import { listUsers } from '@/lib/adminApi';
import { humanize, inr } from '@/lib/format';
import {
  getErrorMessage,
  isSuperAdminRole,
  normalizeRoleName,
} from '@/lib/utils';
import type { User } from '@/types';

/**
 * ============================================================================
 *  ECOSYSTEM HUB
 * ============================================================================
 *
 * The holding-company view. Super admin manages the child platforms —
 * profile, user count, revenue ledger, revenue-share agreement — and the
 * investor sees exactly the same numbers read-only.
 *
 * Money is a two-tier waterfall (no rupee allocated twice):
 *   Tier 1 — each platform's founder shares are paid from that platform's
 *            revenue; the remainder flows up to Esscentra.
 *   Tier 2 — every payment Esscentra received directly (clients + investors)
 *            plus all remainders form the parent pool, split by the parent
 *            agreement (10/50/40).
 * ============================================================================
 */

const STATUS_TONE: Record<PlatformStatus, 'green' | 'blue' | 'amber' | 'gray'> = {
  ACTIVE: 'green',
  BETA: 'blue',
  PAUSED: 'amber',
  SUNSET: 'gray',
};

const pct = (n: number) =>
  `${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, '')}%`;

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
};

const recorderName = (entry: PlatformRevenueEntry): string => {
  const by = entry.recordedBy;
  if (!by || typeof by === 'string') return '—';
  return [by.firstName, by.lastName].filter(Boolean).join(' ') || '—';
};

/* ------------------------------ share editor ------------------------------ */

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-brand-400/60';

/**
 * Rows of (name, percent). Used for both tiers — the platform agreement
 * (may total < 100; remainder flows up) and the parent split (must total 100).
 */
function ShareEditor({
  lines,
  onChange,
  mustTotal100,
  people,
}: {
  lines: ShareLine[];
  onChange: (next: ShareLine[]) => void;
  mustTotal100?: boolean;
  /** Dashboard accounts a line can be linked to (names then track them). */
  people?: Array<{ id: string; name: string; role: string }>;
}) {
  const total = lines.reduce((sum, l) => sum + (Number(l.percent) || 0), 0);
  const remainder = Math.max(0, 100 - total);

  const set = (index: number, patch: Partial<ShareLine>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          {people && people.length > 0 && (
            <select
              className={`${fieldClass} w-44 shrink-0`}
              value={line.userId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                const person = people.find((p) => p.id === id);
                // Linking auto-fills the label; from then on the backend
                // shows the account's LIVE name, so renames follow through.
                set(i, {
                  userId: id,
                  ...(person ? { name: person.name } : {}),
                });
              }}
              aria-label="Link to a dashboard account"
            >
              <option value="">Custom label…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {humanize(p.role)}
                </option>
              ))}
            </select>
          )}
          <input
            className={`${fieldClass} min-w-[10rem] flex-1`}
            value={line.name}
            placeholder="Who — e.g. Investors pool"
            disabled={Boolean(line.userId)}
            title={
              line.userId
                ? 'Linked to a dashboard account — the name follows the account automatically.'
                : undefined
            }
            onChange={(e) => set(i, { name: e.target.value })}
          />
          <div className="relative w-28 shrink-0">
            <input
              className={`${fieldClass} pr-7 text-right`}
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={line.percent}
              onChange={(e) => set(i, { percent: Number(e.target.value) })}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-slate-500">
              %
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, idx) => idx !== i))}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
            aria-label="Remove share"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => onChange([...lines, { name: '', percent: 0 }])}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300 transition hover:text-brand-200"
        >
          <Plus className="h-4 w-4" /> Add share
        </button>
        <span
          className={`text-xs font-semibold ${
            mustTotal100
              ? Math.abs(total - 100) < 0.001
                ? 'text-emerald-300'
                : 'text-rose-300'
              : total > 100
                ? 'text-rose-300'
                : 'text-slate-400'
          }`}
        >
          {mustTotal100
            ? `Total ${pct(total)} — must be exactly 100%`
            : `Allocated ${pct(total)} · to Esscentra ${pct(remainder)}`}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

export default function EcosystemPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canManage = isSuperAdminRole(user?.role);

  const [overview, setOverview] = useState<EcosystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlatformDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [platformModal, setPlatformModal] = useState<'create' | 'edit' | null>(null);
  const [formShares, setFormShares] = useState<ShareLine[]>([]);
  const [revenueModal, setRevenueModal] = useState<
    { entry: PlatformRevenueEntry | null } | null
  >(null);
  const [splitModal, setSplitModal] = useState(false);
  const [splitShares, setSplitShares] = useState<ShareLine[]>([]);
  const [saving, setSaving] = useState(false);

  // The accounts a share line can be linked to — pulled live from the
  // Esscentra dashboard (Users), not typed by hand. Founders + investors.
  const [people, setPeople] = useState<Array<{ id: string; name: string; role: string }>>([]);
  useEffect(() => {
    if (!canManage) return;
    listUsers()
      .then((all: User[]) =>
        setPeople(
          all
            .filter((u) =>
              ['SUPER_ADMIN', 'INVESTOR'].includes(normalizeRoleName(u.role)),
            )
            .map((u) => ({ id: u.id, name: u.name, role: u.role })),
        ),
      )
      .catch(() => setPeople([]));
  }, [canManage]);

  const loadOverview = useCallback(() => {
    getEcosystemOverview()
      .then((data) => {
        setOverview(data);
        setError(null);
        // Keep a platform selected so the ledger below is never orphaned.
        setSelectedId((prev) =>
          prev && data.platforms.some((p) => p.id === prev)
            ? prev
            : (data.platforms[0]?.id ?? null),
        );
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadOverview, [loadOverview]);

  // Monotonic request counter: switching platforms quickly must never let a
  // slow, older response overwrite the newer platform's ledger on screen.
  const detailReq = useRef(0);
  const loadDetail = useCallback(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const req = ++detailReq.current;
    setDetailLoading(true);
    getEcosystemPlatform(selectedId)
      .then((data) => {
        if (req === detailReq.current) setDetail(data);
      })
      .catch((e) => toast.error('Could not load platform', getErrorMessage(e)))
      .finally(() => {
        if (req === detailReq.current) setDetailLoading(false);
      });
  }, [selectedId, toast]);

  useEffect(loadDetail, [loadDetail]);

  const refresh = () => {
    loadOverview();
    loadDetail();
  };

  /* ------------------------------ mutations ------------------------------ */

  const onSubmitPlatform = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get('name') ?? '').trim(),
      category: String(f.get('category') ?? ''),
      website: String(f.get('website') ?? ''),
      status: String(f.get('status') ?? 'ACTIVE') as PlatformStatus,
      launchedAt: String(f.get('launchedAt') ?? '') || null,
      userCount: Number(f.get('userCount') ?? 0) || 0,
      description: String(f.get('description') ?? ''),
      notes: String(f.get('notes') ?? ''),
      shares: formShares.filter((s) => s.name.trim()),
    };
    if (!input.name) return;

    setSaving(true);
    try {
      if (platformModal === 'edit' && selectedId) {
        await updatePlatform(selectedId, input);
        toast.success('Platform updated');
      } else {
        const created = await createPlatform(input);
        setSelectedId(String(created._id));
        toast.success('Platform added to the ecosystem');
      }
      setPlatformModal(null);
      refresh();
    } catch (err) {
      toast.error('Could not save platform', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onDeletePlatform = async (row: EcosystemPlatformRow) => {
    if (
      !window.confirm(
        `Delete "${row.name}"?\n\nIts entire revenue ledger goes with it. ` +
          'The waterfall recomputes without it.',
      )
    )
      return;
    try {
      await deletePlatform(row.id);
      toast.info('Platform deleted', row.name);
      setSelectedId(null);
      loadOverview();
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err));
    }
  };

  const onSubmitRevenue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId || !revenueModal) return;
    const f = new FormData(e.currentTarget);
    const input = {
      period: String(f.get('period') ?? '') || currentPeriod(),
      amount: Number(f.get('amount') ?? 0),
      source: String(f.get('source') ?? ''),
      description: String(f.get('description') ?? ''),
    };

    setSaving(true);
    try {
      if (revenueModal.entry) {
        await updatePlatformRevenue(revenueModal.entry._id, input);
        toast.success('Revenue entry updated');
      } else {
        await addPlatformRevenue(selectedId, input);
        toast.success('Revenue recorded');
      }
      setRevenueModal(null);
      refresh();
    } catch (err) {
      toast.error('Could not save revenue', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteRevenue = async (entry: PlatformRevenueEntry) => {
    if (!window.confirm(`Delete this ${inr(entry.amount)} entry?`)) return;
    try {
      await deletePlatformRevenue(entry._id);
      toast.info('Revenue entry deleted');
      refresh();
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err));
    }
  };

  const onSubmitSplit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const total = splitShares.reduce((s, l) => s + (Number(l.percent) || 0), 0);
    if (Math.abs(total - 100) > 0.001) {
      toast.error(
        'The split must total 100%',
        `It currently totals ${pct(total)}.`,
      );
      return;
    }
    setSaving(true);
    try {
      await updateParentShares(splitShares.filter((s) => s.name.trim()));
      toast.success('Parent split updated');
      setSplitModal(false);
      loadOverview();
    } catch (err) {
      toast.error('Could not save the split', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------- render ------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Holding view" title="Ecosystem" />
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div>
        <PageHeader eyebrow="Holding view" title="Ecosystem" />
        <ErrorState
          message={error ?? 'No data was returned.'}
          onRetry={() => {
            setLoading(true);
            loadOverview();
          }}
        />
      </div>
    );
  }

  const { totals } = overview;
  const selectedRow =
    overview.platforms.find((p) => p.id === selectedId) ?? null;

  // Headline cards are scoped to the child platforms only — Esscentra's own
  // client/investor revenue lives on the finance pages, not here. (It still
  // feeds the distributable pool below, per the standing agreement.)
  const platformsThisMonth = overview.platforms.reduce(
    (sum, p) => sum + p.thisMonth,
    0,
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Holding view"
        title="Ecosystem"
        subtitle={
          canManage
            ? 'Every platform under Esscentra — its users, its revenue, and how each rupee flows up to the parent split.'
            : 'Read-only view of every platform under Esscentra and how revenue flows up to the parent split.'
        }
        action={
          canManage ? (
            <Button
              size="sm"
              onClick={() => {
                setFormShares([]);
                setPlatformModal('create');
              }}
            >
              <Plus className="h-4 w-4" /> New platform
            </Button>
          ) : undefined
        }
      />

      {/* ------------------------------ headline ---------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={IndianRupee}
          label="Platform revenue"
          value={inr(totals.childGross)}
          hint="Every child platform, gross"
          tone="brand"
        />
        <FinanceCard
          icon={TrendingUp}
          label={`This month (${monthLabel(currentPeriod())})`}
          value={inr(platformsThisMonth)}
          hint="Recorded across all platforms"
          tone="green"
        />
        <FinanceCard
          icon={Coins}
          label="Flows to Esscentra"
          value={inr(totals.childToParent)}
          hint={`${inr(totals.founderRetained)} retained by platform founders`}
          tone="teal"
        />
        <FinanceCard
          icon={Users}
          label="Platform users"
          value={totals.totalUsers.toLocaleString('en-IN')}
          hint={`Across ${totals.platformCount} platform${totals.platformCount === 1 ? '' : 's'} · ${totals.activePlatforms} active`}
          tone="violet"
        />
      </div>

      {/* --------------------------- parent split --------------------------- */}
      {/*
        The agreement itself — who takes what percentage — with no rupee
        figures. The distributable pool and each person's amount are personal,
        so they live on each founder's own profile and the investor dashboard
        rather than on a screen every stakeholder can read.
      */}
      <Section
        title="Parent split"
        description="Tier 2 of the waterfall: how everything flowing up to Esscentra is divided per the standing agreement."
      >
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Each platform&rsquo;s remainder joins Esscentra&rsquo;s own revenue and is
              divided as below. Your own share is shown on your profile.
            </p>
            {canManage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSplitShares(
                    overview.parentShares.map((s) => ({
                      name: s.name,
                      percent: s.percent,
                      userId: s.userId ?? null,
                    })),
                  );
                  setSplitModal(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit split
              </Button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {overview.parentShares.map((line, i) => (
              <span
                key={`${line.name}-${i}`}
                className="inline-flex items-baseline gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-200">{line.name}</span>
                <span className="text-xs font-semibold text-brand-300">
                  {pct(line.percent)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------- platform switcher ------------------------ */}
      <Section
        title="Child platforms"
        description={
          canManage
            ? 'Switch between platforms to manage their profile, ledger and agreement.'
            : 'Switch between platforms to inspect their numbers.'
        }
      >
        {overview.platforms.length === 0 ? (
          <div className="glass-card grid place-items-center p-10 text-center">
            <Boxes className="h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-white">
              No child platforms yet
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              {canManage
                ? 'Add the first platform — its revenue will start flowing into the waterfall immediately.'
                : 'Platforms added by the founders will appear here.'}
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {overview.platforms.map((p) => {
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`min-w-[15rem] shrink-0 rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-brand-400/50 bg-gradient-to-br from-brand-500/15 to-brand-700/10 shadow-lg shadow-brand-900/30'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-bold text-white">
                      {p.name}
                    </p>
                    <Pill tone={STATUS_TONE[p.status]}>{humanize(p.status)}</Pill>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {p.category ?? p.slug}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {p.userCount.toLocaleString('en-IN')} users
                    </span>
                    <span className="font-semibold text-white">
                      {inr(p.revenueTotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {pct(p.parentPercent)} → Esscentra · {inr(p.parentAmount)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* -------------------------- selected platform ----------------------- */}
      {selectedRow && (
        <Section
          title={selectedRow.name}
          description="Tier 1 of the waterfall: this platform's agreement is paid first; the remainder flows up to Esscentra."
        >
          <div className="space-y-5">
            <div className="glass-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
                    <Boxes className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-white">
                      {selectedRow.name}
                      {selectedRow.website && (
                        <a
                          href={selectedRow.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-300 transition hover:text-brand-200"
                          aria-label="Open website"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {detail?.description || selectedRow.category || selectedRow.slug}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!detail || detail._id !== selectedRow.id}
                      onClick={() => {
                        setFormShares(
                          (detail?.shares ?? selectedRow.shareLines).map((s) => ({
                            name: s.name,
                            percent: s.percent,
                            userId: s.userId ?? null,
                          })),
                        );
                        setPlatformModal('edit');
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Edit platform
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setRevenueModal({ entry: null })}
                    >
                      <Plus className="h-4 w-4" /> Record revenue
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDeletePlatform(selectedRow)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                      aria-label="Delete platform"
                      title="Delete platform"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Users" value={selectedRow.userCount.toLocaleString('en-IN')} />
                <Stat label="Lifetime revenue" value={inr(selectedRow.revenueTotal)} />
                <Stat label={`This month (${monthLabel(currentPeriod())})`} value={inr(selectedRow.thisMonth)} />
                <Stat
                  label="Flows to Esscentra"
                  value={inr(selectedRow.parentAmount)}
                  hint={pct(selectedRow.parentPercent)}
                />
              </div>

              {/* Tier-1 breakdown */}
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Revenue-share agreement
                </p>
                <div className="mt-3 space-y-2">
                  {selectedRow.shareLines.length === 0 && (
                    <p className="text-sm text-slate-400">
                      No platform-specific shares — 100% of this platform's
                      revenue flows to the Esscentra pool.
                    </p>
                  )}
                  {selectedRow.shareLines.map((line, i) => (
                    <div
                      key={`${line.name}-${i}`}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-200">
                        {line.name}
                        <span className="ml-2 text-xs font-semibold text-brand-300">
                          {pct(line.percent)}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-white">
                        {inr(line.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-2 text-sm">
                    <span className="text-slate-300">
                      Esscentra pool
                      <span className="ml-2 text-xs font-semibold text-emerald-300">
                        {pct(selectedRow.parentPercent)}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold text-emerald-300">
                      {inr(selectedRow.parentAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger */}
            <FinanceTable<PlatformRevenueEntry>
              rows={detail?.entries ?? []}
              rowKey={(row) => row._id}
              emptyTitle={detailLoading ? 'Loading ledger…' : 'No revenue recorded yet'}
              emptyMessage={
                canManage
                  ? 'Record this platform’s monthly revenue and the waterfall recomputes instantly.'
                  : 'Revenue recorded by the founders will appear here.'
              }
              maxHeight={480}
              columns={[
                {
                  key: 'period',
                  header: 'Month',
                  render: (row) => (
                    <span className="font-medium text-slate-100">
                      {monthLabel(row.period)}
                    </span>
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
                  key: 'source',
                  header: 'Source',
                  hideOnMobile: true,
                  render: (row) => (
                    <Pill tone="gray">{humanize(row.source || 'GENERAL')}</Pill>
                  ),
                },
                {
                  key: 'description',
                  header: 'Note',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-slate-400">{row.description || '—'}</span>
                  ),
                },
                {
                  key: 'recordedBy',
                  header: 'Recorded by',
                  hideOnMobile: true,
                  render: (row) => (
                    <span className="text-slate-400">{recorderName(row)}</span>
                  ),
                },
                ...(canManage
                  ? [
                      {
                        key: 'actions',
                        header: '',
                        align: 'center' as const,
                        render: (row: PlatformRevenueEntry) => (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setRevenueModal({ entry: row })}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                              aria-label="Edit entry"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteRevenue(row)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                              aria-label="Delete entry"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </Section>
      )}

      {!canManage && (
        <InfoNote tone="info">
          You are viewing the ecosystem read-only. Platforms, revenue and the
          split are maintained by the founders.
        </InfoNote>
      )}

      {/* --------------------------- platform modal ------------------------- */}
      {canManage && (
        <Modal
          open={platformModal !== null}
          onClose={() => setPlatformModal(null)}
          title={platformModal === 'edit' ? 'Edit platform' : 'New platform'}
        >
          <form
            key={platformModal === 'edit' ? (selectedId ?? 'edit') : 'create'}
            onSubmit={onSubmitPlatform}
            className="space-y-4"
          >
            <Input
              label="Platform name"
              name="name"
              required
              defaultValue={platformModal === 'edit' ? selectedRow?.name : ''}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Category"
                name="category"
                placeholder="SaaS, Marketplace…"
                defaultValue={
                  platformModal === 'edit' ? (selectedRow?.category ?? '') : ''
                }
              />
              <Input
                label="Website"
                name="website"
                placeholder="https://…"
                defaultValue={
                  platformModal === 'edit' ? (selectedRow?.website ?? '') : ''
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Status"
                name="status"
                defaultValue={
                  platformModal === 'edit' ? selectedRow?.status : 'ACTIVE'
                }
                options={PLATFORM_STATUSES.map((s) => ({
                  value: s,
                  label: humanize(s),
                }))}
              />
              <Input
                label="Launched"
                name="launchedAt"
                type="date"
                className="!pl-4"
                defaultValue={
                  platformModal === 'edit'
                    ? (selectedRow?.launchedAt?.slice(0, 10) ?? '')
                    : ''
                }
              />
              <Input
                label="Users"
                name="userCount"
                type="number"
                min={0}
                defaultValue={
                  platformModal === 'edit' ? selectedRow?.userCount : 0
                }
              />
            </div>

            <Textarea
              label="Description"
              name="description"
              rows={2}
              defaultValue={
                platformModal === 'edit' ? (detail?.description ?? '') : ''
              }
            />

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-slate-200">
                Platform revenue shares
              </p>
              <p className="mb-3 mt-0.5 text-xs text-slate-500">
                Founder bonuses for whoever built and runs this platform. Paid
                first — whatever is left flows to the Esscentra pool and the
                10/50/40 split.
              </p>
              <ShareEditor lines={formShares} onChange={setFormShares} people={people} />
            </div>

            <Textarea
              label="Agreement notes"
              name="notes"
              rows={2}
              placeholder="Reference to the signed agreement, effective date…"
              defaultValue={platformModal === 'edit' ? (detail?.notes ?? '') : ''}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPlatformModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : platformModal === 'edit'
                    ? 'Save changes'
                    : 'Add platform'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---------------------------- revenue modal ------------------------- */}
      {canManage && (
        <Modal
          open={revenueModal !== null}
          onClose={() => setRevenueModal(null)}
          title={revenueModal?.entry ? 'Edit revenue entry' : 'Record revenue'}
        >
          <form
            key={revenueModal?.entry?._id ?? 'new-revenue'}
            onSubmit={onSubmitRevenue}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Month"
                name="period"
                type="month"
                required
                className="!pl-4"
                defaultValue={revenueModal?.entry?.period ?? currentPeriod()}
              />
              <Input
                label="Amount (INR)"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={revenueModal?.entry?.amount}
              />
            </div>
            <Input
              label="Source"
              name="source"
              placeholder="SUBSCRIPTIONS, SERVICES, ADS…"
              defaultValue={revenueModal?.entry?.source ?? ''}
            />
            <Textarea
              label="Note"
              name="description"
              rows={2}
              defaultValue={revenueModal?.entry?.description ?? ''}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRevenueModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : revenueModal?.entry ? 'Save changes' : 'Record'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ----------------------------- split modal -------------------------- */}
      {canManage && (
        <Modal
          open={splitModal}
          onClose={() => setSplitModal(false)}
          title="Parent revenue split"
        >
          <form onSubmit={onSubmitSplit} className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-400">
              Tier 2 of the waterfall — how the distributable parent pool is
              divided. Link each line to a dashboard account so the name always
              matches the Esscentra dashboard, keep "Custom label" for pooled
              lines like Investors, and make it total exactly 100%.
            </p>
            <ShareEditor
              lines={splitShares}
              onChange={setSplitShares}
              mustTotal100
              people={people}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSplitModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save split'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- bits ----------------------------------- */

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold text-white">
        {value}
        {hint && (
          <span className="ml-2 text-xs font-semibold text-emerald-300">{hint}</span>
        )}
      </p>
    </div>
  );
}
