import { useEffect, useMemo, useState } from 'react';
import {
  Building,
  Building2,
  CheckCircle2,
  Globe,
  PauseCircle,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Input } from '@/components/ui/Input';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import { listAccounts } from '@/lib/accountApi';
import type { Account } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Accounts are READ-ONLY. A company (account) is created only when a Lead    */
/*  is converted (POST /leads/:id/convert-to-account). This page just lists    */
/*  them:  load → GET /accounts                                                */
/* -------------------------------------------------------------------------- */

const STATUS_TONE: Record<Account['status'], Tone> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
};

export default function AccountsPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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
  ];

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Accounts"
        subtitle="The companies you work with — created automatically when a lead is converted."
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
              ? 'Accounts appear here automatically when you convert a lead. Head to the Leads page and convert a qualified lead to create its account.'
              : 'Try a different search.'
          }
        />
      ) : (
        <DataTable columns={columns} rows={filtered} />
      )}
    </div>
  );
}
