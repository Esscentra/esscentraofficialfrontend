import { useMemo, useState, type FormEvent } from 'react';
import { Building, Globe, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
import { useCrm } from '@/context/CrmStore';
import type { Account } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Step 1 of the CRM flow: create the COMPANY (account). Contacts and         */
/*  opportunities attach to it. UI only — wire later:                          */
/*    load   → GET    /accounts                                                */
/*    create → POST   /accounts   (ownerId is set by the backend)             */
/*    update → PATCH  /accounts/:id                                            */
/*    delete → DELETE /accounts/:id                                           */
/* -------------------------------------------------------------------------- */

const STATUS_TONE: Record<Account['status'], Tone> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
};

const INDUSTRIES = [
  'Technology',
  'Manufacturing',
  'Consulting',
  'Finance',
  'Healthcare',
  'Retail',
  'Education',
  'Other',
];

export default function AccountsPage() {
  const toast = useToast();
  const { accounts, addAccount, updateAccount, removeAccount } = useCrm();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.companyName.toLowerCase().includes(q) ||
        (a.industry ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        (a.city ?? '').toLowerCase().includes(q),
    );
  }, [accounts, query]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const close = () => { setOpen(false); setEditing(null); };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      companyName: String(f.get('companyName') ?? '').trim(),
      website: String(f.get('website') ?? '').trim(),
      industry: String(f.get('industry') ?? ''),
      email: String(f.get('email') ?? '').trim(),
      phone: String(f.get('phone') ?? '').trim(),
      city: String(f.get('city') ?? '').trim(),
      state: String(f.get('state') ?? '').trim(),
      country: String(f.get('country') ?? '').trim(),
      notes: String(f.get('notes') ?? ''),
      status: String(f.get('status') ?? 'ACTIVE') as Account['status'],
    };
    if (!data.companyName) return;

    if (editing) {
      updateAccount(editing.id, data);
      toast.success('Account updated');
    } else {
      addAccount(data);
      toast.success('Account created');
    }
    close();
  };

  const remove = (a: Account) => {
    removeAccount(a.id);
    toast.info('Account deleted', a.companyName);
  };

  const columns: Column<Account>[] = [
    {
      key: 'company',
      header: 'Company',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
            <Building className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{a.companyName}</p>
            {a.website && (
              <a
                href={a.website}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 truncate text-xs text-brand-300 hover:underline"
              >
                <Globe className="h-3 w-3" /> {a.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      ),
    },
    { key: 'industry', header: 'Industry', render: (a) => a.industry || '—' },
    {
      key: 'location',
      header: 'Location',
      render: (a) => [a.city, a.country].filter(Boolean).join(', ') || '—',
    },
    { key: 'email', header: 'Email', render: (a) => a.email || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge tone={STATUS_TONE[a.status]}>{humanize(a.status)}</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (a) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(a); setOpen(true); }} aria-label="Edit" title="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(a)} aria-label="Delete" title="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="The companies you work with — the parent of contacts and opportunities."
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        }
      />

      {accounts.length > 0 && (
        <div className="mb-4 sm:max-w-sm">
          <Input
            label=""
            icon={<Search />}
            placeholder="Search companies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building}
          title={accounts.length === 0 ? 'Create your first account' : 'No matches'}
          description={
            accounts.length === 0
              ? 'An account is a company you do business with. Add one here — then you can create opportunities and contacts against it.'
              : 'Try a different search.'
          }
          action={
            accounts.length === 0 ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" /> New account
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable columns={columns} rows={filtered} />
      )}

      <Modal open={open} onClose={close} title={editing ? 'Edit account' : 'New account'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Company name" name="companyName" defaultValue={editing?.companyName} required />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Industry"
              name="industry"
              defaultValue={editing?.industry ?? 'Technology'}
              options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
            />
            <Select
              label="Status"
              name="status"
              defaultValue={editing?.status ?? 'ACTIVE'}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Website" name="website" defaultValue={editing?.website} placeholder="https://…" />
            <Input label="Email" name="email" type="email" defaultValue={editing?.email} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" name="phone" defaultValue={editing?.phone} />
            <Input label="City" name="city" defaultValue={editing?.city} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="State" name="state" defaultValue={editing?.state} />
            <Input label="Country" name="country" defaultValue={editing?.country} />
          </div>

          <Textarea label="Notes" name="notes" defaultValue={editing?.notes} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create account'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
