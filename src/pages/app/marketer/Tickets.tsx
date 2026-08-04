import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  LifeBuoy,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { Pill, Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  createTicket,
  deleteTicket,
  listTickets,
  replyToTicket,
  updateTicket,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketsView,
} from '@/lib/marketerApi';
import { useMarketerData } from './useMarketerData';
import { humanize } from '@/lib/format';
import { getErrorMessage, isAdminRole } from '@/lib/utils';

/**
 * ============================================================================
 *  SUPPORT TICKETS
 * ============================================================================
 *
 * The contractor's channel into the company. They raise a ticket, edit or
 * withdraw it while it is still open, and carry on the conversation in the
 * thread. Only the Esscentra team moves the status — otherwise an escalation
 * could be closed by the person escalating.
 *
 * The same page serves an admin: they see the whole queue and can reply and
 * resolve, which keeps one conversation view instead of two that drift.
 * ============================================================================
 */

const STATUS_TONE: Record<string, 'blue' | 'amber' | 'green' | 'gray'> = {
  OPEN: 'amber',
  IN_PROGRESS: 'blue',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

const PRIORITY_TONE: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
};

function when(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dd}-${mm}-${date.getFullYear()} · ${time}`;
}

function personName(ref: unknown): string {
  if (!ref || typeof ref !== 'object') return 'Unknown';
  const person = ref as { firstName?: string; lastName?: string; email?: string };
  return (
    [person.firstName, person.lastName].filter(Boolean).join(' ') ||
    person.email ||
    'Unknown'
  );
}

export default function MarketerTickets() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [tab, setTab] = useState<'' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('');
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const { data, loading, error, reload } = useMarketerData<TicketsView>(
    () => listTickets(),
    [],
  );

  /* --------------------------------- raise --------------------------------- */

  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'OTHER' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const raise = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Missing details', 'A subject and a description are required.');
      return;
    }

    setSaving(true);
    try {
      await createTicket(form, files);
      toast.success('Ticket raised', 'The Esscentra team has been notified.');
      setComposing(false);
      setForm({ subject: '', description: '', category: 'OTHER', priority: 'MEDIUM' });
      setFiles([]);
      reload();
    } catch (thrown) {
      toast.error('Could not raise the ticket', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const send = async (ticketId: string) => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyToTicket(ticketId, reply.trim());
      setReply('');
      reload();
    } catch (thrown) {
      toast.error('Could not send', getErrorMessage(thrown));
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (ticketId: string, status: Ticket['status']) => {
    try {
      await updateTicket(ticketId, { status });
      toast.success('Ticket updated', `Marked ${humanize(status).toLowerCase()}.`);
      reload();
    } catch (thrown) {
      toast.error('Could not update', getErrorMessage(thrown));
    }
  };

  const withdraw = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId);
      toast.success('Ticket withdrawn', 'It has been removed.');
      setOpenId(null);
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Support" title="Tickets" />
        <CardGridSkeleton count={4} />
        <TableSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Support" title="Tickets" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const rows = tab ? data.rows.filter((row) => row.status === tab) : data.rows;
  const active = data.rows.find((row) => row._id === openId) ?? null;

  const TABS = [
    { value: '' as const, label: 'All', count: data.summary.total },
    { value: 'OPEN' as const, label: 'Open', count: data.summary.open },
    { value: 'IN_PROGRESS' as const, label: 'In progress', count: data.summary.inProgress },
    { value: 'RESOLVED' as const, label: 'Resolved', count: data.summary.resolved },
    { value: 'CLOSED' as const, label: 'Closed', count: data.summary.closed },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Support"
        title={isAdmin ? 'Support tickets' : 'Raise a ticket'}
        subtitle={
          isAdmin
            ? 'Issues raised by contract staff. Reply in the thread and move the status as you work.'
            : 'Anything blocking you — payments, access, a task, a document. Raise it here and follow the reply.'
        }
        action={
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New ticket
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceCard
          icon={LifeBuoy}
          label="All tickets"
          value={data.summary.total}
          hint="Raised by you"
          tone="brand"
        />
        <FinanceCard
          icon={Clock}
          label="Open"
          value={data.summary.open}
          hint="Waiting to be picked up"
          tone="amber"
        />
        <FinanceCard
          icon={MessageSquare}
          label="In progress"
          value={data.summary.inProgress}
          hint="Someone is on it"
          tone="sky"
        />
        <FinanceCard
          icon={CheckCircle2}
          label="Resolved"
          value={data.summary.resolved}
          hint="Answered"
          tone="green"
        />
      </div>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1">
        {TABS.map((entry) => {
          const activeTab = tab === entry.value;
          return (
            <button
              key={entry.value || 'all'}
              type="button"
              onClick={() => setTab(entry.value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab
                  ? 'bg-gradient-to-r from-brand-500/80 to-brand-700/70 !text-white shadow'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {entry.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  activeTab ? 'bg-white/20 !text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {entry.count}
              </span>
            </button>
          );
        })}
      </div>

      <Section title="Your tickets" description="Newest activity first.">
        {rows.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="font-display text-base font-semibold text-white">
              Nothing here
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Raise a ticket and it will appear here with the team's replies.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((ticket) => (
              <button
                key={ticket._id}
                type="button"
                onClick={() => {
                  setOpenId(ticket._id);
                  setReply('');
                }}
                className="glass-card card-lift w-full p-4 text-left"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-brand-300">
                        {ticket.reference}
                      </span>
                      <span className="truncate font-semibold text-white">
                        {ticket.subject}
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                      {ticket.description}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {isAdmin ? `${personName(ticket.raisedBy)} · ` : ''}
                      {when(ticket.lastActivityAt)}
                      {ticket.replies.length > 0 &&
                        ` · ${ticket.replies.length} repl${ticket.replies.length === 1 ? 'y' : 'ies'}`}
                      {ticket.attachments.length > 0 &&
                        ` · ${ticket.attachments.length} file${ticket.attachments.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Pill tone={PRIORITY_TONE[ticket.priority] ?? 'gray'}>
                      {humanize(ticket.priority)}
                    </Pill>
                    <Pill tone={STATUS_TONE[ticket.status] ?? 'gray'}>
                      {humanize(ticket.status)}
                    </Pill>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* ------------------------------ compose ------------------------------- */}
      <Modal open={composing} onClose={() => setComposing(false)} title="Raise a ticket">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Subject
            </span>
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              placeholder="What is the issue?"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Category
              </span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as TicketCategory })
                }
                className="select-field h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
              >
                {TICKET_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Priority
              </span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value as TicketPriority })
                }
                className="select-field h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
              >
                {TICKET_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={5}
              placeholder="What happened, and what do you need?"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Paperclip className="h-3.5 w-3.5" />
              Attach evidence (optional, up to 5)
            </span>
            <input
              type="file"
              multiple
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []).slice(0, 5))
              }
              className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-200"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void raise()}
              disabled={saving}
              className="h-10 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Raising…' : 'Raise ticket'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------- thread ------------------------------- */}
      <Modal
        open={Boolean(active)}
        onClose={() => setOpenId(null)}
        title={active ? `${active.reference} — ${active.subject}` : 'Ticket'}
      >
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={STATUS_TONE[active.status] ?? 'gray'}>
                {humanize(active.status)}
              </Pill>
              <Pill tone={PRIORITY_TONE[active.priority] ?? 'gray'}>
                {humanize(active.priority)}
              </Pill>
              <Pill tone="blue">{humanize(active.category)}</Pill>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm leading-relaxed text-slate-200">
                {active.description}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                {personName(active.raisedBy)} · {when(active.createdAt)}
              </p>
            </div>

            {active.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {active.attachments.map((file, index) => (
                  <a
                    key={file._id ?? index}
                    href={file.unavailable ? undefined : file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] ${
                      file.unavailable
                        ? 'cursor-not-allowed opacity-50'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    {file.originalName ?? `Attachment ${index + 1}`}
                  </a>
                ))}
              </div>
            )}

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {active.replies.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No replies yet. The team will respond here.
                </p>
              ) : (
                active.replies.map((entry, index) => (
                  <div
                    key={entry._id ?? index}
                    className={`rounded-xl border p-3 ${
                      entry.fromStaff
                        ? 'border-brand-400/25 bg-brand-500/[0.08]'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <p className="text-sm leading-relaxed text-slate-200">
                      {entry.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {entry.fromStaff ? 'Esscentra team' : personName(entry.authorId)} ·{' '}
                      {when(entry.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {active.status !== 'CLOSED' && (
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void send(active._id);
                  }}
                  placeholder="Write a reply…"
                  className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none focus:border-brand-400/50"
                />
                <button
                  type="button"
                  onClick={() => void send(active._id)}
                  disabled={sending || !reply.trim()}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 text-white disabled:opacity-50"
                  aria-label="Send reply"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  {(['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const)
                    .filter((status) => status !== active.status)
                    .map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void setStatus(active._id, status)}
                        className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        Mark {humanize(status).toLowerCase()}
                      </button>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  The Esscentra team moves the status as they work on it.
                </p>
              )}

              {(active.status === 'OPEN' || active.status === 'IN_PROGRESS') && (
                <button
                  type="button"
                  onClick={() => void withdraw(active._id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Withdraw
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
