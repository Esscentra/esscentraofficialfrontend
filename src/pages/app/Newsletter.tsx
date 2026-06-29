import { useState, type FormEvent } from 'react';
import { Mail, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
import type { NewsletterSubscriber } from '@/types';

export default function NewsletterPage() {
  const toast = useToast();
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [open, setOpen] = useState(false);

  // TODO (load): GET /newsletter

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? '');
    // TODO (create): POST /newsletter  body { email }
    setItems((prev) => [
      { id: crypto.randomUUID(), email, isSubscribed: true, subscribedAt: new Date().toISOString() },
      ...prev,
    ]);
    toast.success('Subscriber added');
    setOpen(false);
  };

  const toggle = (sub: NewsletterSubscriber) => {
    // TODO (unsubscribe): PATCH /newsletter/:id/unsubscribe
    setItems((prev) =>
      prev.map((it) => (it.id === sub.id ? { ...it, isSubscribed: !it.isSubscribed } : it)),
    );
    toast.info(sub.isSubscribed ? 'Marked unsubscribed' : 'Marked subscribed');
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /newsletter/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Subscriber removed');
  };

  const columns: Column<NewsletterSubscriber>[] = [
    { key: 'email', header: 'Email', render: (s) => <span className="font-medium text-white">{s.email}</span> },
    {
      key: 'isSubscribed',
      header: 'Status',
      render: (s) => (
        <StatusBadge tone={s.isSubscribed ? 'green' : 'gray'}>
          {s.isSubscribed ? 'subscribed' : 'unsubscribed'}
        </StatusBadge>
      ),
    },
    {
      key: 'subscribedAt',
      header: 'Since',
      render: (s) => (s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={() => toggle(s)}>
            {s.isSubscribed ? 'Unsubscribe' : 'Resubscribe'}
          </Button>
          <RowButton onClick={() => remove(s.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle="Manage your subscribers."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add subscriber
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No subscribers yet"
          description="Wire up GET /newsletter to load subscribers. Add one to preview the UI."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add subscriber
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add subscriber">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" name="email" type="email" required placeholder="subscriber@example.com" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add subscriber</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
