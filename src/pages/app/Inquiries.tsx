import { useState, type FormEvent } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
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
import type { ContactInquiry, InquiryStatus } from '@/types';

const STATUSES: InquiryStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
const TONE: Record<InquiryStatus, Tone> = {
  NEW: 'blue',
  ASSIGNED: 'sky',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
};

export default function InquiriesPage() {
  const toast = useToast();
  const [items, setItems] = useState<ContactInquiry[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ContactInquiry | null>(null);

  // TODO (load): GET /contact-inquiries

  const openCreate = () => {
    setActive(null);
    setOpen(true);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    if (active) {
      // Editing an existing inquiry → only the status is editable here.
      const status = String(f.get('status') ?? 'NEW') as InquiryStatus;
      // TODO (update): PATCH /contact-inquiries/:id  body { status }
      setItems((prev) => prev.map((it) => (it.id === active.id ? { ...it, status } : it)));
      toast.success('Inquiry updated');
    } else {
      const data = {
        name: String(f.get('name') ?? ''),
        email: String(f.get('email') ?? ''),
        phone: String(f.get('phone') ?? ''),
        company: String(f.get('company') ?? ''),
        message: String(f.get('message') ?? ''),
        status: 'NEW' as InquiryStatus,
        isConverted: false,
      };
      // TODO (create): POST /contact-inquiries  (this is the public website contact form)
      setItems((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev]);
      toast.success('Inquiry added');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /contact-inquiries/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Inquiry deleted');
  };

  const columns: Column<ContactInquiry>[] = [
    { key: 'name', header: 'Name', render: (i) => <span className="font-medium text-white">{i.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'company', header: 'Company', render: (i) => i.company || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <StatusBadge tone={TONE[i.status]}>{humanize(i.status)}</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (i) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={() => { setActive(i); setOpen(true); }}>
            View
          </Button>
          <RowButton onClick={() => remove(i.id)} aria-label="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inquiries"
        subtitle="Inbound requests from your contact form."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add inquiry
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No inquiries yet"
          description="Wire up GET /contact-inquiries to load them. Add one to preview the UI."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add inquiry
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={active ? 'Inquiry' : 'New inquiry'}>
        <form onSubmit={onSubmit} className="space-y-4">
          {active ? (
            <>
              <div className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                <p className="font-semibold text-white">{active.name}</p>
                <p className="text-slate-400">{active.email}</p>
                {active.company && <p className="text-slate-400">{active.company}</p>}
                <p className="mt-2 whitespace-pre-wrap text-slate-300">{active.message}</p>
              </div>
              <Select
                label="Status"
                name="status"
                defaultValue={active.status}
                options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
              />
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Name" name="name" required />
                <Input label="Email" name="email" type="email" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Phone" name="phone" />
                <Input label="Company" name="company" />
              </div>
              <Textarea label="Message" name="message" rows={4} required />
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{active ? 'Update status' : 'Add inquiry'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
