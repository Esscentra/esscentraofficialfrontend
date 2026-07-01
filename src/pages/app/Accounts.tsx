import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Building2,
  CheckCircle2,
  Globe,
  PauseCircle,
  Plus,
  Search,
  Target,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { listAccounts, createAccount } from '@/lib/accountApi';
import type { Account } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Accounts (companies). Created here manually, or automatically when a Lead  */
/*  is converted (POST /leads/:id/convert-to-account).                         */
/*    load   → GET  /accounts                                                  */
/*    create → POST /accounts   (ownerId is set by the backend)               */
/*  Update / delete are intentionally not available.                          */
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
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    setLoading(true);
    listAccounts()
      .then((data) => on && setAccounts(data))
      .catch(
        (e) =>
          on && toast.error('Could not load accounts', getErrorMessage(e, 'Admin access required.')),
      )
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [toast]);

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

  const stats = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((a) => a.status === 'ACTIVE').length,
      inactive: accounts.filter((a) => a.status === 'INACTIVE').length,
    }),
    [accounts],
  );

  /* ------------------------------ Create account --------------------------- */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

    setBusy(true);
    try {
      const created = await createAccount(data);
      setAccounts((prev) => [created, ...prev]);
      toast.success('Account created', created.companyName);
      setOpen(false);
    } catch (err) {
      toast.error('Create failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------- Add opportunity ----------------------------- */
  const addOpportunity = (a: Account) => {
    // Open the Opportunities page with this account preselected.
    navigate('/app/opportunities', {
      state: { accountId: a.id, companyName: a.companyName },
    });
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
    { key: 'owner', header: 'Owner', render: (a) => a.ownerName || '—' },
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
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => addOpportunity(a)} title="Add opportunity">
            <Target className="h-4 w-4" /> Add opportunity
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Accounts"
        subtitle="The companies you work with — created manually or when a lead is converted."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        }
      />

      {accounts.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Building2} label="Total accounts" value={stats.total} tone="brand" />
          <StatCard icon={CheckCircle2} label="Active" value={stats.active} tone="green" />
          <StatCard icon={PauseCircle} label="Inactive" value={stats.inactive} tone="amber" />
        </div>
      )}

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

      {loading ? (
        <LoadingCard />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building}
          title={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
          description={
            accounts.length === 0
              ? 'Create an account here, or convert a qualified lead on the Leads page to add one automatically.'
              : 'Try a different search.'
          }
          action={
            accounts.length === 0 ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New account
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable columns={columns} rows={filtered} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New account">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Company name" name="companyName" required />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Industry"
              name="industry"
              defaultValue="Technology"
              options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
            />
            <Select
              label="Status"
              name="status"
              defaultValue="ACTIVE"
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Website" name="website" placeholder="https://…" />
            <Input label="Email" name="email" type="email" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" name="phone" />
            <Input label="City" name="city" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="State" name="state" />
            <Input label="Country" name="country" />
          </div>

          <Textarea label="Notes" name="notes" />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
