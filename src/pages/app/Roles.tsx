import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Crown,
  LayoutGrid,
  Pencil,
  Plus,
  ShieldCheck,
  ShieldHalf,
  TrendingUp,
  Trash2,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { createRole, deleteRole, listRoles, updateRole } from '@/lib/adminApi';
import { getErrorMessage } from '@/lib/utils';
import type { Role } from '@/types';

/* ---------------------- role → tier / icon / colour ------------------------ */

function roleMeta(name: string): { label: string; order: number; icon: LucideIcon; chip: string } {
  const n = (name ?? '').toUpperCase();
  if (n.includes('SUPER'))
    return { label: 'Owner · full control', order: 0, icon: Crown, chip: 'from-violet-400/30 to-violet-700/15 text-violet-200 ring-violet-400/30' };
  if (n.includes('ADMIN'))
    return { label: 'Administrator', order: 1, icon: ShieldCheck, chip: 'from-brand-400/30 to-brand-700/15 text-brand-200 ring-brand-400/30' };
  if (n.includes('MANAG'))
    return { label: 'Management', order: 2, icon: UserCog, chip: 'from-sky-400/30 to-sky-700/15 text-sky-200 ring-sky-400/30' };
  if (n.includes('ACCOUNT') || n.includes('FINANC'))
    return { label: 'Finance', order: 3, icon: Wallet, chip: 'from-emerald-400/30 to-emerald-700/15 text-emerald-200 ring-emerald-400/30' };
  if (n.includes('STAFF') || n.includes('EMPLOY') || n.includes('MEMBER') || n.includes('TEAM'))
    return { label: 'Team', order: 4, icon: Users, chip: 'from-brand-400/25 to-brand-700/10 text-brand-200 ring-brand-400/25' };
  if (n.includes('INVEST'))
    return { label: 'Stakeholder · read-only', order: 5, icon: TrendingUp, chip: 'from-amber-400/30 to-amber-700/15 text-amber-200 ring-amber-400/30' };
  return { label: 'Custom role', order: 10, icon: ShieldHalf, chip: 'from-white/10 to-white/[0.04] text-slate-200 ring-white/15' };
}

/** Turn a free-text description into individual responsibility bullets. */
function responsibilities(desc?: string): string[] {
  if (!desc) return [];
  return desc
    .split(/\r?\n|•|;|(?<=\.)\s+/)
    .map((s) => s.trim().replace(/^[-*]\s*/, ''))
    .filter(Boolean);
}

/**
 * Roles the application depends on by name. The auth middleware compares
 * against these literally, so renaming or deleting one breaks access control
 * for everyone holding it. The backend rejects both operations too — this is
 * the UI half, so the buttons are never offered in the first place.
 */
const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'USER', 'INVESTOR'];

const isSystemRole = (name?: string) =>
  !!name && SYSTEM_ROLES.includes(name.toUpperCase());

/** "SUPER_ADMIN" → "Super Admin". */
function prettyName(name: string): string {
  return (name ?? '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pricing-style comparison of roles & responsibilities, shown in a wide modal. */
function RolesChartModal({
  open,
  onClose,
  roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: Role[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const sorted = [...roles].sort((a, b) => {
    const diff = roleMeta(a.name).order - roleMeta(b.name).order;
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card relative z-10 my-4 w-full max-w-6xl !rounded-2xl p-0"
            role="dialog"
            aria-modal="true"
            aria-label="Roles and responsibilities"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
                  <ShieldHalf className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    Roles &amp; responsibilities
                  </h2>
                  <p className="text-xs text-slate-400">
                    What each access level can do — ordered by seniority
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pricing-style tier columns */}
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((r, i) => {
                  const m = roleMeta(r.name);
                  const Icon = m.icon;
                  const items = responsibilities(r.description);
                  const featured = i === 0; // highest tier
                  return (
                    <div
                      key={r.id}
                      className={`relative flex flex-col rounded-2xl border p-5 transition ${
                        featured
                          ? 'border-brand-400/40 bg-gradient-to-b from-brand-500/[0.12] to-transparent ring-1 ring-brand-400/25'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      {featured && (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-b from-brand-500 to-brand-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide !text-white shadow ring-1 ring-inset ring-white/20">
                          Highest access
                        </span>
                      )}

                      <span
                        className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ring-1 ${m.chip}`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>

                      <h3 className="mt-4 text-lg font-bold text-white">{prettyName(r.name)}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        {m.order === 10 ? 'Custom role' : `${m.label} · Tier ${m.order + 1}`}
                      </p>

                      <div className="my-4 h-px bg-white/10" />

                      {items.length > 0 ? (
                        <ul className="flex-1 space-y-2.5">
                          {items.map((it, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 text-sm text-slate-300"
                            >
                              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/25">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                              <span className="min-w-0">{it}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="flex-1 text-sm text-slate-500">
                          No responsibilities described yet.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default function RolesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);

  /* -------------------------------- Load roles ------------------------------- */
  useEffect(() => {
    let active = true;
    setLoading(true);
    listRoles()
      .then((roles) => {
        if (active) setItems(roles);
      })
      .catch((e) => {
        if (active) toast.error('Could not load roles', getErrorMessage(e, 'Admin access is required.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  /* ------------------------------ Create / update ---------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get('name') ?? '').trim(),
      description: String(f.get('description') ?? ''),
    };
    if (!input.name) return;

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateRole(editing.id, input);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)));
        toast.success('Role updated');
      } else {
        const created = await createRole(input);
        setItems((prev) => [created, ...prev]);
        toast.success('Role created');
      }
      setOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(editing ? 'Update failed' : 'Create failed', getErrorMessage(e, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- Delete --------------------------------- */
  const remove = async (role: Role) => {
    if (isSystemRole(role.name)) {
      toast.error(
        'System role',
        `"${role.name}" is required by the app's access checks and cannot be deleted.`,
      );
      return;
    }

    if (
      !window.confirm(
        `Delete the "${role.name}" role?\n\n` +
          `Anyone still assigned to it would lose their access level. ` +
          `This cannot be undone.`,
      )
    )
      return;

    const prev = items;
    setItems((p) => p.filter((it) => it.id !== role.id)); // optimistic
    try {
      await deleteRole(role.id);
      toast.info('Role deleted', role.name);
    } catch (e) {
      setItems(prev); // rollback — e.g. the backend refused because users still hold it
      toast.error('Delete failed', getErrorMessage(e, 'Please try again.'));
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => <StatusBadge tone="blue">{r.name}</StatusBadge>,
    },
    { key: 'description', header: 'Description', render: (r) => r.description || '—' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(r); setOpen(true); }} aria-label="Edit" title="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton
            onClick={() => remove(r)}
            aria-label="Delete"
            title={
              isSystemRole(r.name)
                ? 'System role — required by the app’s access checks'
                : 'Delete'
            }
            disabled={isSystemRole(r.name)}
            danger
          >
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Define the access roles for your team."
        action={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setChartOpen(true)}>
                <LayoutGrid className="h-4 w-4" /> Roles chart
              </Button>
            )}
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New role
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingCard label="Loading roles…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldHalf}
          title="No roles yet"
          description="Create a role to get started. Roles control what each user can access."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New role
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <RolesChartModal open={chartOpen} onClose={() => setChartOpen(false)} roles={items} />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Edit role' : 'New role'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            defaultValue={editing?.name}
            placeholder="MANAGER"
            hint={
              isSystemRole(editing?.name)
                ? 'System role — the name is fixed. You can still edit the description.'
                : 'Stored in uppercase.'
            }
            readOnly={isSystemRole(editing?.name)}
            required
          />
          <Textarea
            label="Description"
            name="description"
            defaultValue={editing?.description}
            placeholder="What can this role do?"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setOpen(false); setEditing(null); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
