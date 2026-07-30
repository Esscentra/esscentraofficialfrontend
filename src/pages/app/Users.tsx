import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  ChevronRight,
  Eye,
  HandCoins,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage, isInvestorRole, isSuperAdminRole } from '@/lib/utils';
import { listRoles, listUsers, updateUserRole } from '@/lib/adminApi';
import { InvestorRecordsModal } from '@/components/InvestorRecordsModal';
import type { Role, User } from '@/types';

const ROLE_TONE: Record<string, Tone> = {
  SUPER_ADMIN: 'violet',
  ADMIN: 'blue',
  MANAGER: 'sky',
  ACCOUNTANT: 'amber',
  USER: 'gray',
  CLIENT: 'gray',
};

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  BLOCKED: 'red',
};

const KYC_TONE: Record<string, Tone> = {
  APPROVED: 'green',
  UNDER_REVIEW: 'sky',
  PENDING: 'amber',
  REJECTED: 'red',
  NOT_SUBMITTED: 'gray',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** A single label/value row inside the user-profile detail modal. */
function Detail({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-0.5 flex items-center gap-1.5 break-words text-sm text-slate-200 ${
          mono ? 'font-mono text-xs text-slate-400' : ''
        }`}
      >
        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  // Super admins may assign/modify the SUPER_ADMIN role; admins may not.
  const iAmSuper = isSuperAdminRole(me?.role);

  const [items, setItems] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Change-role modal state
  const [editing, setEditing] = useState<User | null>(null);
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  // View-profile modal state
  const [viewing, setViewing] = useState<User | null>(null);
  // Investor records modal (commitments, investments, invoices, bills)
  const [records, setRecords] = useState<User | null>(null);

  /* ----------------------------- Load users + roles ----------------------------- */
  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([listUsers(), listRoles()])
      .then(([users, rolesList]) => {
        if (!active) return;
        setItems(users);
        setRoles(rolesList);
      })
      .catch((e) => {
        if (active)
          toast.error('Could not load users', getErrorMessage(e, 'Admin access is required.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [toast]);

  // role name → _id, so we can preselect the user's current role in the dropdown.
  const roleIdByName = useMemo(() => {
    const m = new Map<string, string>();
    roles.forEach((r) => m.set(r.name, r.id));
    return m;
  }, [roles]);

  /* -------------------------------- Filtering -------------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((u) => {
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [items, query, roleFilter]);

  /* ---------------------------------- Edit ---------------------------------- */
  const openEdit = (u: User) => {
    setEditing(u);
    setRoleId(roleIdByName.get(u.role) ?? '');
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing || !roleId) return;

    const newRoleName = roles.find((r) => r.id === roleId)?.name ?? editing.role;
    if (newRoleName === editing.role) {
      setEditing(null);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserRole(editing.id, roleId);
      setItems((prev) =>
        prev.map((it) =>
          it.id === editing.id ? { ...it, role: updated.role || newRoleName } : it,
        ),
      );
      toast.success('Role updated', `${editing.name} is now ${humanize(newRoleName)}.`);
      setEditing(null);
    } catch (e) {
      toast.error('Update failed', getErrorMessage(e, 'The role change could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------- Columns -------------------------------- */
  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar src={u.avatarUrl} name={u.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{u.name}</p>
            <p className="truncate text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <StatusBadge tone={ROLE_TONE[u.role] ?? 'gray'}>{humanize(u.role)}</StatusBadge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) =>
        u.status ? (
          <StatusBadge tone={STATUS_TONE[u.status] ?? 'gray'}>{humanize(u.status)}</StatusBadge>
        ) : (
          '—'
        ),
    },
    {
      key: 'kyc',
      header: 'KYC',
      render: (u) =>
        u.kycStatus ? (
          <StatusBadge tone={KYC_TONE[u.kycStatus] ?? 'gray'}>{humanize(u.kycStatus)}</StatusBadge>
        ) : (
          '—'
        ),
    },
    {
      key: 'verified',
      header: 'Email',
      render: (u) =>
        u.emailVerified ? (
          <StatusBadge tone="green">Verified</StatusBadge>
        ) : (
          <StatusBadge tone="amber">Unverified</StatusBadge>
        ),
    },
    { key: 'phone', header: 'Phone', render: (u) => u.phone || '—' },
    { key: 'createdAt', header: 'Joined', render: (u) => fmtDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) => {
        // Only a super admin may modify a super-admin account.
        const locked = isSuperAdminRole(u.role) && !iAmSuper;
        return (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <RowButton onClick={() => setViewing(u)} aria-label="View profile" title="View profile">
              <Eye className="h-4 w-4" />
            </RowButton>
            <RowButton
              onClick={() => openEdit(u)}
              aria-label="Change role"
              title={locked ? 'Only a super admin can modify this account' : 'Change role'}
              disabled={locked}
            >
              <UserCog className="h-4 w-4" />
            </RowButton>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="All accounts on the platform. Change a user's role from here."
      />

      {/* Toolbar: search + role filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label=""
            icon={<Search />}
            placeholder="Search by name, email or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label=""
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All roles' },
              ...roles.map((r) => ({ value: r.name, label: humanize(r.name) })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <LoadingCard label="Loading users…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={items.length === 0 ? 'No users found' : 'No matches'}
          description={
            items.length === 0
              ? 'There are no accounts yet, or your session lacks admin access.'
              : 'Try a different search or role filter.'
          }
        />
      ) : (
        <>
          <DataTable columns={columns} rows={filtered} onRowClick={setViewing} />
          <p className="mt-3 text-xs text-slate-500">
            Showing {filtered.length} of {items.length} users
          </p>
        </>
      )}

      {/* View full profile modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="User profile">
        {viewing && (
          <div className="space-y-5">
            {/* Identity header */}
            <div className="flex items-center gap-4">
              <Avatar
                src={viewing.avatarUrl}
                name={viewing.name}
                className="h-16 w-16"
                textClassName="text-lg"
                rounded="rounded-2xl"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-bold text-white">{viewing.name}</h3>
                  {viewing.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-400">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {viewing.email}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge tone={ROLE_TONE[viewing.role] ?? 'gray'}>{humanize(viewing.role)}</StatusBadge>
                  {viewing.status && (
                    <StatusBadge tone={STATUS_TONE[viewing.status] ?? 'gray'}>
                      {humanize(viewing.status)}
                    </StatusBadge>
                  )}
                  <StatusBadge tone={KYC_TONE[viewing.kycStatus ?? 'NOT_SUBMITTED'] ?? 'gray'}>
                    KYC: {humanize(viewing.kycStatus ?? 'NOT_SUBMITTED')}
                  </StatusBadge>
                </div>
              </div>
            </div>

            {/* Full detail grid */}
            <dl className="grid gap-x-4 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-2">
              <Detail label="First name" value={viewing.firstName || '—'} />
              <Detail label="Last name" value={viewing.lastName || '—'} />
              <Detail
                label="Phone"
                value={viewing.phone || '—'}
                icon={<Phone className="h-3.5 w-3.5" />}
              />
              <Detail label="Role" value={humanize(viewing.role)} />
              <Detail label="Account status" value={viewing.status ? humanize(viewing.status) : '—'} />
              <Detail
                label="KYC status"
                value={humanize(viewing.kycStatus ?? 'NOT_SUBMITTED')}
              />
              <Detail label="Email verified" value={viewing.emailVerified ? 'Yes' : 'No'} />
              <Detail label="Member since" value={fmtDate(viewing.createdAt)} />
              {viewing.bio && (
                <div className="sm:col-span-2">
                  <Detail label="Bio" value={viewing.bio} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Detail label="User ID" value={viewing.id} mono />
              </div>
            </dl>

            {/* Investor: full financial records */}
            {isInvestorRole(viewing.role) && (
              <button
                type="button"
                onClick={() => {
                  const u = viewing;
                  setViewing(null);
                  setRecords(u);
                }}
                className="glass-card card-lift flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-200 ring-1 ring-brand-400/30">
                  <HandCoins className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    View investor records
                  </span>
                  <span className="block text-xs text-slate-400">
                    Commitments, investments, invoices &amp; bills — with preview
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            )}

            <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              {!(isSuperAdminRole(viewing.role) && !iAmSuper) && (
                <Button
                  onClick={() => {
                    const u = viewing;
                    setViewing(null);
                    openEdit(u);
                  }}
                >
                  <UserCog className="h-4 w-4" /> Change role
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <InvestorRecordsModal
        open={!!records}
        onClose={() => setRecords(null)}
        investor={records}
      />

      {/* Change role modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Change role">
        {editing && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
              <Avatar
                src={editing.avatarUrl}
                name={editing.name}
                className="h-10 w-10"
                textClassName="text-sm"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{editing.name}</p>
                <p className="truncate text-xs text-slate-400">{editing.email}</p>
              </div>
            </div>

            <Select
              label="Role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              options={
                roles.length
                  ? roles
                      // Admins can't grant SUPER_ADMIN — only super admins can.
                      .filter((r) => iAmSuper || !isSuperAdminRole(r.name))
                      .map((r) => ({ value: r.id, label: humanize(r.name) }))
                  : [{ value: '', label: 'No roles available' }]
              }
              required
            />

            {editing.id === me?.id && (
              <p className="flex items-center gap-2 text-xs text-amber-400">
                <ShieldCheck className="h-4 w-4" /> You're editing your own account — changing your
                role may revoke your admin access.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !roleId}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
