import { useMemo, useState, type FormEvent } from 'react';
import { Building, Layers, Pencil, Plus, Target, Trophy, Trash2, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
import { useCrm } from '@/context/CrmStore';
import type { Opportunity, OpportunityStage } from '@/types';

/* -------------------------------------------------------------------------- */
/*  Step 2 of the CRM flow: a deal that BELONGS TO an account.                 */
/*  The backend rejects an opportunity without a valid accountId, so the form  */
/*  makes the account the first, required field. UI only — wire later:         */
/*    load   → GET    /opportunities                                           */
/*    create → POST   /opportunities  { accountId, title, amount, ... }        */
/*    update → PATCH  /opportunities/:id                                       */
/*    delete → DELETE /opportunities/:id                                       */
/* -------------------------------------------------------------------------- */

const STAGES: OpportunityStage[] = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const TONE: Record<OpportunityStage, Tone> = {
  NEW: 'blue',
  QUALIFIED: 'sky',
  PROPOSAL: 'violet',
  NEGOTIATION: 'amber',
  WON: 'green',
  LOST: 'red',
};

const BAR: Record<OpportunityStage, string> = {
  NEW: 'bg-brand-500',
  QUALIFIED: 'bg-sky-500',
  PROPOSAL: 'bg-violet-500',
  NEGOTIATION: 'bg-amber-500',
  WON: 'bg-emerald-500',
  LOST: 'bg-rose-500',
};
const OPEN_STAGES: OpportunityStage[] = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

const money = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0);

const compactMoney = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n || 0);

/** Slim stacked bar that shows how deals are distributed across stages. */
function PipelineBar({ items }: { items: Opportunity[] }) {
  const total = items.length;
  const counts = STAGES.map((stage) => ({
    stage,
    n: items.filter((o) => o.stage === stage).length,
  }));

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-white">Pipeline by stage</p>
        <span className="text-xs text-slate-400">{total} deals</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        {counts
          .filter((c) => c.n > 0)
          .map((c) => (
            <div
              key={c.stage}
              className={`${BAR[c.stage]} transition-all`}
              style={{ width: `${(c.n / total) * 100}%` }}
              title={`${humanize(c.stage)}: ${c.n}`}
            />
          ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
        {counts.map((c) => (
          <span key={c.stage} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${BAR[c.stage]}`} />
            {humanize(c.stage)}
            <span className="font-semibold text-slate-200 tabular-nums">{c.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const toast = useToast();
  const { accounts, opportunities, addOpportunity, updateOpportunity, removeOpportunity, accountName } =
    useCrm();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);

  const hasAccounts = accounts.length > 0;

  const stats = useMemo(() => {
    const open = opportunities.filter((o) => OPEN_STAGES.includes(o.stage));
    const won = opportunities.filter((o) => o.stage === 'WON');
    const lost = opportunities.filter((o) => o.stage === 'LOST');
    const decided = won.length + lost.length;
    return {
      pipelineValue: open.reduce((s, o) => s + (o.amount || 0), 0),
      openCount: open.length,
      wonValue: won.reduce((s, o) => s + (o.amount || 0), 0),
      winRate: decided ? Math.round((won.length / decided) * 100) : 0,
    };
  }, [opportunities]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const close = () => { setOpen(false); setEditing(null); };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      accountId: String(f.get('accountId') ?? ''),
      title: String(f.get('title') ?? '').trim(),
      description: String(f.get('description') ?? ''),
      amount: Number(f.get('amount') ?? 0),
      probability: Number(f.get('probability') ?? 0),
      stage: String(f.get('stage') ?? 'NEW') as OpportunityStage,
      expectedCloseDate: String(f.get('expectedCloseDate') ?? ''),
    };
    if (!data.accountId || !data.title) return;

    if (editing) {
      updateOpportunity(editing.id, data);
      toast.success('Opportunity updated');
    } else {
      addOpportunity(data);
      toast.success('Opportunity created');
    }
    close();
  };

  const remove = (o: Opportunity) => {
    removeOpportunity(o.id);
    toast.info('Opportunity deleted', o.title);
  };

  const columns: Column<Opportunity>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (o) => <span className="font-medium text-white">{o.title}</span>,
    },
    {
      key: 'account',
      header: 'Account',
      render: (o) => (
        <span className="inline-flex items-center gap-1.5 text-slate-300">
          <Building className="h-3.5 w-3.5 text-brand-300" /> {accountName(o.accountId)}
        </span>
      ),
    },
    { key: 'amount', header: 'Amount', render: (o) => money(o.amount) },
    { key: 'probability', header: 'Win %', render: (o) => `${o.probability ?? 0}%` },
    {
      key: 'stage',
      header: 'Stage',
      render: (o) => <StatusBadge tone={TONE[o.stage]}>{humanize(o.stage)}</StatusBadge>,
    },
    {
      key: 'expectedCloseDate',
      header: 'Close date',
      render: (o) => (o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (o) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(o); setOpen(true); }} aria-label="Edit" title="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(o)} aria-label="Delete" title="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="CRM · Step 2"
        title="Opportunities"
        subtitle="Deals in your pipeline. Each one belongs to an account."
        action={
          <Button size="sm" onClick={openNew} disabled={!hasAccounts} title={!hasAccounts ? 'Create an account first' : undefined}>
            <Plus className="h-4 w-4" /> New opportunity
          </Button>
        }
      />

      {hasAccounts && opportunities.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Wallet} label="Pipeline value" value={compactMoney(stats.pipelineValue)} tone="brand" />
            <StatCard icon={Layers} label="Open deals" value={stats.openCount} tone="sky" />
            <StatCard icon={Trophy} label="Won value" value={compactMoney(stats.wonValue)} tone="green" />
            <StatCard icon={Target} label="Win rate" value={`${stats.winRate}%`} tone="violet" />
          </div>
          <div className="mb-6">
            <PipelineBar items={opportunities} />
          </div>
        </>
      )}

      {!hasAccounts ? (
        // Enforce the flow: no account → no opportunity.
        <EmptyState
          icon={Building}
          title="Create an account first"
          description="Opportunities belong to a company. Add an account, then come back to create a deal against it."
          action={
            <Link to="/app/accounts">
              <Button size="sm">
                <Building className="h-4 w-4" /> Go to Accounts
              </Button>
            </Link>
          }
        />
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No opportunities yet"
          description="Create your first deal and attach it to one of your accounts."
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> New opportunity
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={opportunities} />
      )}

      <Modal open={open} onClose={close} title={editing ? 'Edit opportunity' : 'New opportunity'}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Account first — the required parent of the deal. */}
          <Select
            label="Account"
            name="accountId"
            defaultValue={editing?.accountId ?? accounts[0]?.id ?? ''}
            options={accounts.map((a) => ({ value: a.id, label: a.companyName }))}
            required
          />

          <Input label="Title" name="title" defaultValue={editing?.title} placeholder="e.g. Annual license renewal" required />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount (USD)" name="amount" type="number" min={0} defaultValue={editing?.amount} required />
            <Input
              label="Probability (%)"
              name="probability"
              type="number"
              min={0}
              max={100}
              defaultValue={editing?.probability}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Stage"
              name="stage"
              defaultValue={editing?.stage ?? 'NEW'}
              options={STAGES.map((s) => ({ value: s, label: humanize(s) }))}
            />
            <Input
              label="Expected close date"
              name="expectedCloseDate"
              type="date"
              defaultValue={editing?.expectedCloseDate?.slice(0, 10)}
              className="!pl-4 [color-scheme:dark]"
            />
          </div>

          <Textarea label="Description" name="description" defaultValue={editing?.description} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create opportunity'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
