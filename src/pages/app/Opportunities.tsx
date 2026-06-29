import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Target, Trash2 } from 'lucide-react';
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
import type { Opportunity, OpportunityStage } from '@/types';

const STAGES: OpportunityStage[] = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const TONE: Record<OpportunityStage, Tone> = {
  NEW: 'blue',
  QUALIFIED: 'sky',
  PROPOSAL: 'violet',
  NEGOTIATION: 'amber',
  WON: 'green',
  LOST: 'red',
};

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function OpportunitiesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);

  // TODO (load): GET /opportunities

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      title: String(f.get('title') ?? ''),
      description: String(f.get('description') ?? ''),
      amount: Number(f.get('amount') ?? 0),
      probability: Number(f.get('probability') ?? 0),
      stage: String(f.get('stage') ?? 'NEW') as OpportunityStage,
      expectedCloseDate: String(f.get('expectedCloseDate') ?? ''),
    };

    if (editing) {
      // TODO (update): PATCH /opportunities/:id
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Opportunity updated');
    } else {
      // TODO (create): POST /opportunities — body also needs accountId (+ ownerId is set from the token)
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Opportunity created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /opportunities/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Opportunity deleted');
  };

  const columns: Column<Opportunity>[] = [
    { key: 'title', header: 'Title', render: (o) => <span className="font-medium text-white">{o.title}</span> },
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
          <RowButton onClick={() => { setEditing(o); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(o.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Track deals through your pipeline."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New opportunity
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No opportunities yet"
          description="Wire up GET /opportunities to load deals. Create one to preview the UI."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New opportunity
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit opportunity' : 'New opportunity'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Title" name="title" defaultValue={editing?.title} required />
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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create opportunity'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
