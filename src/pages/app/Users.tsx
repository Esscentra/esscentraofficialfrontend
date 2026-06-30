import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage, initials, isSuperAdminRole } from '@/lib/utils';
import { listRoles, listUsers, updateUserRole } from '@/lib/adminApi';
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
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white ring-1 ring-white/20">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
            ) : (
              initials(u.name)
            )}
          </div>
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
          <div className="flex justify-end gap-1">
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
          <DataTable columns={columns} rows={filtered} />
          <p className="mt-3 text-xs text-slate-500">
            Showing {filtered.length} of {items.length} users
          </p>
        </>
      )}

      {/* Change role modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Change role">
        {editing && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white ring-1 ring-white/20">
                {editing.avatarUrl ? (
                  <img src={editing.avatarUrl} alt={editing.name} className="h-full w-full object-cover" />
                ) : (
                  initials(editing.name)
                )}
              </div>
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
