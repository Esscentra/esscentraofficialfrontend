import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building, Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import {
  createContact,
  deleteContact as apiDeleteContact,
  listContacts,
  updateContact,
} from '@/lib/contactApi';
import { listAccounts } from '@/lib/accountApi';
import type { Account, Contact } from '@/types';

export default function ContactsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  /* ------------------------------- Load data ------------------------------- */
  useEffect(() => {
    let on = true;
    setLoading(true);
    // Accounts are best-effort (used for the picker + account column).
    Promise.all([listContacts(), listAccounts().catch(() => [])])
      .then(([contacts, accs]) => {
        if (!on) return;
        setItems(contacts);
        setAccounts(accs);
      })
      .catch((e) => on && toast.error('Could not load contacts', getErrorMessage(e)))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

  const accountName = useMemo(() => {
    const m = new Map(accounts.map((a) => [a.id, a.companyName]));
    return (id?: string) => (id ? m.get(id) : undefined);
  }, [accounts]);

  const accountOptions = useMemo(
    () => [
      { value: '', label: accounts.length ? 'Select an account…' : 'No accounts available' },
      ...accounts.map((a) => ({ value: a.id, label: a.companyName })),
    ],
    [accounts],
  );

  /* ------------------------------ Create / edit ---------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      firstName: String(f.get('firstName') ?? '').trim(),
      lastName: String(f.get('lastName') ?? '').trim(),
      email: String(f.get('email') ?? '').trim(),
      phone: String(f.get('phone') ?? '').trim(),
      designation: String(f.get('designation') ?? '').trim(),
      notes: String(f.get('notes') ?? '').trim(),
      accountId: String(f.get('accountId') ?? ''),
    };
    if (!input.firstName) return;

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateContact(editing.id, input);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)));
        toast.success('Contact updated');
      } else {
        const created = await createContact(input);
        setItems((prev) => [created, ...prev]);
        toast.success('Contact created');
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(editing ? 'Update failed' : 'Create failed', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Contact) => {
    const prev = items;
    setItems((p) => p.filter((it) => it.id !== c.id)); // optimistic
    try {
      await apiDeleteContact(c.id);
      toast.info('Contact deleted');
    } catch (err) {
      setItems(prev); // rollback
      toast.error('Delete failed', getErrorMessage(err));
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white">
            {[c.firstName, c.lastName].filter(Boolean).join(' ')}
          </p>
          {c.designation && <p className="truncate text-xs text-slate-500">{c.designation}</p>}
        </div>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (c) => {
        const name = c.accountName ?? accountName(c.accountId);
        return name ? (
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Building className="h-3.5 w-3.5 text-brand-300" /> {name}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        );
      },
    },
    { key: 'email', header: 'Email', render: (c) => c.email || '—' },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || '—' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(c); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(c)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="People at your accounts."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New contact
          </Button>
        }
      />

      {loading ? (
        <LoadingCard label="Loading contacts…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No contacts yet"
          description={
            accounts.length === 0
              ? 'Create an account first, then add the people who work there.'
              : 'Add the people you work with at each account.'
          }
          action={
            accounts.length === 0 ? (
              <Link to="/app/accounts">
                <Button size="sm">
                  <Building className="h-4 w-4" /> Go to Accounts
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="h-4 w-4" /> New contact
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable columns={columns} rows={items} />
          <p className="mt-3 text-xs text-slate-500">
            {items.length} {items.length === 1 ? 'contact' : 'contacts'}
          </p>
        </>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Edit contact' : 'New contact'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Account"
            name="accountId"
            defaultValue={editing?.accountId ?? ''}
            options={accountOptions}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" name="firstName" defaultValue={editing?.firstName} required />
            <Input label="Last name" name="lastName" defaultValue={editing?.lastName} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" defaultValue={editing?.email} />
            <Input label="Phone" name="phone" defaultValue={editing?.phone} />
          </div>
          <Input label="Designation" name="designation" defaultValue={editing?.designation} placeholder="CTO, Buyer…" />
          <Textarea label="Notes" name="notes" defaultValue={editing?.notes} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create contact'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
