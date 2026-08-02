import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Download,
  FileText,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FinanceCard } from '@/components/finance/FinanceCard';
import { FinanceTable, TotalCell } from '@/components/finance/FinanceTable';
import {
  Pill,
  RangeFilter,
  SelectControl,
  statusTone,
  type DateRange,
} from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { listUsers } from '@/lib/adminApi';
import { getRoles } from '@/lib/roleApi';
import { PAYMENT_MODES } from '@/lib/financeApi';
import {
  INVOICE_KINDS,
  INVOICE_PARTY_TYPES,
  INVOICE_STATUSES,
  createInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getNextInvoiceNumber,
  listInvoices,
  markInvoicePaid,
  updateInvoice,
  type InvoiceKind,
  type InvoiceListResult,
  type InvoicePartyType,
  type InvoiceRecord,
} from '@/lib/invoiceApi';
import { useInvestorData } from '../investor/useInvestorData';
import { getErrorMessage, isSuperAdminRole, normalizeRoleName } from '@/lib/utils';
import { formatDate, humanize, inr, inrExact } from '@/lib/format';
import type { User } from '@/types';

/**
 * ============================================================================
 *  ADMIN — INVOICES & PAYMENT BILLS
 * ============================================================================
 *
 * A document studio, not just a form: creating or editing opens a two-pane
 * editor with a live A4 preview that mirrors the server-rendered PDF —
 * professional black-and-white with the blue Esscentra brand block, exactly
 * what the party will receive. What you see is what gets generated.
 *
 *  - INVOICE — raised BEFORE money is collected.
 *  - BILL    — the receipt AFTER payment has been received.
 *
 * Documents remain editable at any time (the PDF regenerates on every save).
 * Only a SUPER ADMIN can generate, edit or delete; the server enforces the
 * same rule. PDFs carry no GST and no signature, and live in Cloudinary.
 * ============================================================================
 */

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM: ItemRow = { description: '', quantity: '1', unitPrice: '' };

const EMPTY_FORM = {
  kind: 'INVOICE' as InvoiceKind,
  partyType: 'CLIENT' as InvoicePartyType,
  partyId: '',
  partyName: '',
  partyEmail: '',
  partyPhone: '',
  partyAddress: '',
  discount: '',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  paidAt: new Date().toISOString().slice(0, 10),
  paymentMode: 'BANK_TRANSFER',
  referenceNumber: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

const rupees = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

/* ------------------------- amount in words (Indian) ------------------------ */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function two(value: number): string {
  if (value < 20) return ONES[value] ?? '';
  return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ''}`;
}

function three(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? two(rest) : '']
    .filter(Boolean)
    .join(' ');
}

/** Mirrors the backend's `amountInWords` so the preview matches the PDF. */
function amountInWords(amount: number): string {
  const value = Math.round(Math.abs(amount) * 100) / 100;
  const whole = Math.floor(value);
  const paise = Math.round((value - whole) * 100);
  if (whole === 0 && paise === 0) return 'Rupees Zero Only';

  const parts: string[] = [];
  const crore = Math.floor(whole / 10_000_000);
  const lakh = Math.floor((whole % 10_000_000) / 100_000);
  const thousand = Math.floor((whole % 100_000) / 1_000);
  const below = whole % 1_000;
  if (crore) parts.push(`${two(crore) || three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (below) parts.push(three(below));

  let words = `Rupees ${parts.join(' ') || 'Zero'}`;
  if (paise) words += ` and Paise ${two(paise)}`;
  return `${words} Only`;
}

/* ------------------------------ live preview ------------------------------- */

/** The logo's own blue, with very light tints of it for bands and panels. */
const LOGO_BLUE = '#0D58F8';
const BAND = '#DCE7FD';
const MUTEDC = '#5B6677';
const PANEL = '#EFF4FE';
const INKC = '#111827';

/**
 * A faithful HTML rendition of the server-generated PDF, modelled on classic
 * Indian trade-invoice stationery: navy company name, grey document panel,
 * navy items band, amount in words beside the Gross Amount band, numbered
 * terms — and no signature block. Updates on every keystroke.
 */
function DocumentPreview({
  form,
  items,
  subtotal,
  discount,
  total,
  number,
}: {
  form: FormState;
  items: ItemRow[];
  subtotal: number;
  discount: number;
  total: number;
  number?: string;
}) {
  const isBill = form.kind === 'BILL';
  const rows = items.filter((item) => item.description.trim() || rupees(item.unitPrice) > 0);
  const totalQty = rows.reduce((sum, item) => sum + (rupees(item.quantity) || 1), 0);
  const previewDate = (value: string) => (value ? formatDate(value) : '—');
  const plain = (value: number) => inrExact(value).replace('₹', '');

  const panelRows: Array<[string, string]> = [
    [isBill ? 'Bill No.' : 'Invoice No.', number ?? 'Assigned on save'],
    ['Date', previewDate(form.issueDate)],
  ];
  if (!isBill && form.dueDate) panelRows.push(['Due Date', previewDate(form.dueDate)]);
  if (isBill) {
    panelRows.push(['Paid On', previewDate(form.paidAt)]);
    panelRows.push(['Mode', humanize(form.paymentMode)]);
    if (form.referenceNumber) panelRows.push(['Ref', form.referenceNumber]);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white p-2 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.55)]">
      <div
        className="rounded-lg px-7 py-6 sm:px-9"
        style={{ color: INKC, border: '1px solid #D8E2F7' }}
      >
        {/* Letterhead + document panel */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <img src="/assets/images/logo.png" alt="" className="h-9 w-9" />
              <p className="text-[26px] font-extrabold leading-none tracking-tight" style={{ color: LOGO_BLUE }}>
                ESSCENTRA
              </p>
            </div>
            <p className="mt-2.5 text-[10.5px]" style={{ color: MUTEDC }}>
              Building essential digital experiences
            </p>
            <p className="text-[10.5px]" style={{ color: MUTEDC }}>
              +91 80190 90040 · official@esscentra.in · www.esscentra.in
            </p>
          </div>

          <div className="w-56 px-4 py-3" style={{ backgroundColor: PANEL }}>
            <p className="text-[10px] font-bold tracking-[0.3em]" style={{ color: LOGO_BLUE }}>
              {isBill ? 'PAYMENT BILL' : 'INVOICE'}
            </p>
            <div className="mt-2 space-y-1">
              {panelRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2 text-[10.5px]">
                  <span style={{ color: MUTEDC }}>{label}</span>
                  <span className="truncate font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Party */}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.18em]" style={{ color: MUTEDC }}>
              {isBill ? 'RECEIVED FROM' : 'BILL TO'}
            </p>
            <p className="mt-1 text-base font-bold">{form.partyName || 'Party name'}</p>
            <p className="text-[10.5px]" style={{ color: MUTEDC }}>
              {[form.partyEmail, form.partyPhone].filter(Boolean).join(' · ')}
            </p>
            {form.partyAddress && (
              <p className="max-w-[300px] text-[10.5px]" style={{ color: MUTEDC }}>
                {form.partyAddress}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold tracking-[0.18em]" style={{ color: MUTEDC }}>
              PARTY TYPE
            </p>
            <p className="mt-1 text-sm font-bold">{humanize(form.partyType)}</p>
          </div>
        </div>

        {/* Items */}
        <table className="mt-5 w-full text-[11px]">
          <thead>
            <tr style={{ backgroundColor: BAND, color: LOGO_BLUE }}>
              <th className="px-2.5 py-2 text-left text-[10px] font-bold">#</th>
              <th className="px-2.5 py-2 text-left text-[10px] font-bold">DESCRIPTION</th>
              <th className="px-2.5 py-2 text-right text-[10px] font-bold">QTY</th>
              <th className="px-2.5 py-2 text-right text-[10px] font-bold">RATE</th>
              <th className="px-2.5 py-2 text-right text-[10px] font-bold">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(rows.length ? rows : [EMPTY_ITEM]).map((item, index) => (
              <tr
                key={index}
                style={{ backgroundColor: index % 2 === 1 ? '#F7FAFF' : 'transparent' }}
              >
                <td className="px-2.5 py-2 align-top" style={{ color: MUTEDC }}>
                  {index + 1}
                </td>
                <td className="px-2.5 py-2 align-top font-bold">
                  {item.description.trim() || (
                    <span className="font-normal" style={{ color: '#9AA3B2' }}>
                      Item description…
                    </span>
                  )}
                </td>
                <td className="px-2.5 py-2 text-right align-top tabular-nums">
                  {rupees(item.quantity) || 1}
                </td>
                <td className="px-2.5 py-2 text-right align-top tabular-nums">
                  {plain(rupees(item.unitPrice))}
                </td>
                <td className="px-2.5 py-2 text-right align-top tabular-nums">
                  {plain((rupees(item.quantity) || 1) * rupees(item.unitPrice))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* A small breather after the items — the sheet grows with the rows */}
        <div className="h-5" />

        {/* Totals rule */}
        <div
          className="flex justify-between border-y py-2 text-[11px] font-bold"
          style={{ borderTopColor: INKC, borderBottomColor: '#DFE4EC' }}
        >
          <span className="pl-7">Total</span>
          <span className="flex gap-10 pr-2.5 tabular-nums">
            <span>{totalQty}</span>
            <span>{plain(subtotal)}</span>
          </span>
        </div>

        {/* Amount in words + summary panel — 3 cm below the Total, as on the PDF */}
        <div className="mt-24 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-[280px]">
            <p className="text-[9px] font-bold tracking-[0.18em]" style={{ color: MUTEDC }}>
              AMOUNT CHARGEABLE (IN WORDS)
            </p>
            <p className="mt-1.5 text-[11.5px] font-bold leading-snug">{amountInWords(total)}</p>
          </div>

          <div className="w-60 p-1.5" style={{ backgroundColor: PANEL }}>
            <div className="space-y-1.5 px-2.5 pb-2 pt-1.5 text-[10.5px]">
              <div className="flex justify-between">
                <span style={{ color: MUTEDC }}>Subtotal</span>
                <span className="font-bold tabular-nums">{plain(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: MUTEDC }}>Discount</span>
                  <span className="font-bold tabular-nums">- {plain(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: MUTEDC }}>GST</span>
                <span className="font-bold">Not applicable</span>
              </div>
            </div>
            <div
              className="flex items-center justify-between px-3 py-2 font-bold"
              style={{ backgroundColor: BAND, color: LOGO_BLUE }}
            >
              <span className="text-[11px]">Gross Amount</span>
              <span className="tabular-nums">{inrExact(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes, terms and the PAID mark (never a signature) */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-[340px]">
            {form.notes && (
              <div className="mb-3">
                <p className="text-[9px] font-bold tracking-[0.18em]" style={{ color: MUTEDC }}>
                  NOTES
                </p>
                <p className="mt-1 text-[10px]" style={{ color: MUTEDC }}>
                  {form.notes}
                </p>
              </div>
            )}
            <p className="text-[9px] font-bold tracking-[0.18em]" style={{ color: MUTEDC }}>
              TERMS &amp; CONDITIONS
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[9.5px]" style={{ color: MUTEDC }}>
              <li>
                This is a computer-generated {isBill ? 'payment bill' : 'invoice'} and does not
                require a signature.
              </li>
              <li>All amounts are in Indian Rupees. GST is not applicable.</li>
              {!isBill && form.dueDate && <li>Payment is due by {previewDate(form.dueDate)}.</li>}
              <li>Subject to local jurisdiction only. E. &amp; O.E.</li>
            </ol>
          </div>
          {isBill && (
            <img
              src="/assets/images/paid-stamp.png"
              alt="Paid"
              className="h-28 w-28 shrink-0"
            />
          )}
        </div>

        <hr className="mt-6" style={{ borderColor: '#DFE4EC' }} />
        <p className="mt-2.5 text-center text-[9px]" style={{ color: MUTEDC }}>
          Esscentra · official@esscentra.in · www.esscentra.in · +91 80190 90040
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function InvoicesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);

  const [paying, setPaying] = useState<InvoiceRecord | null>(null);
  const [payForm, setPayForm] = useState({
    paidAt: new Date().toISOString().slice(0, 10),
    paymentMode: 'BANK_TRANSFER',
    referenceNumber: '',
    generateBill: true,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  /** The number the document will receive, fetched live per kind. */
  const [nextNumbers, setNextNumbers] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useInvestorData<InvoiceListResult>(
    () =>
      listInvoices({
        ...range,
        kind: kind || undefined,
        status: status || undefined,
        search: search || undefined,
        limit: 200,
      }),
    [range.from, range.to, kind, status, search],
  );

  // Accounts and role types are only needed inside the editor; fetch lazily.
  useEffect(() => {
    if (!editorOpen || !isSuperAdmin) return;
    if (users.length === 0) {
      listUsers()
        .then(setUsers)
        .catch(() => undefined);
    }
    if (roleNames.length === 0) {
      getRoles()
        .then((roles) => setRoleNames(roles.map((role) => normalizeRoleName(role.name))))
        .catch(() => undefined);
    }
  }, [editorOpen, users.length, roleNames.length, isSuperAdmin]);

  // The upcoming document number, keyed by kind + issue date: the YYMM in the
  // number follows the invoice date the admin picks, not today's date.
  const numberKey = `${form.kind}-${form.issueDate}`;
  useEffect(() => {
    if (!editorOpen || editing || nextNumbers[numberKey]) return;
    getNextInvoiceNumber(form.kind, form.issueDate || undefined)
      .then((number) =>
        setNextNumbers((prev) => ({ ...prev, [numberKey]: number })),
      )
      .catch(() => undefined);
  }, [editorOpen, editing, form.kind, form.issueDate, numberKey, nextNumbers]);

  /**
   * Party types are DYNAMIC: every role in the roles collection, plus the
   * external kinds a role can never cover (a client or vendor has no login).
   * INVOICE_PARTY_TYPES is only the offline fallback.
   */
  const partyTypeOptions = useMemo(() => {
    const names = [
      ...roleNames,
      ...INVOICE_PARTY_TYPES.filter((value) => !roleNames.includes(value)),
    ];
    return [...new Set(names)].map((value) => ({ value, label: humanize(value) }));
  }, [roleNames]);

  /**
   * Linked accounts follow the selected party type: choosing "Investor" lists
   * only investor accounts, a custom role lists only that role's accounts,
   * and external kinds (Client, Vendor, ...) list nothing to link.
   */
  const accountOptions = useMemo(() => {
    const matching = users.filter(
      (account) => normalizeRoleName(account.role) === form.partyType,
    );
    return [
      {
        value: '',
        label: matching.length
          ? 'No linked account'
          : 'No accounts with this role — external party',
      },
      ...matching
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((account) => ({
          value: account.id,
          label: `${account.name} (${account.email})`,
        })),
    ];
  }, [users, form.partyType]);

  /** Changing the party type drops a linked account that no longer matches. */
  const onPickPartyType = (value: string) => {
    setForm((prev) => {
      const linked = users.find((account) => account.id === prev.partyId);
      const stillMatches = linked && normalizeRoleName(linked.role) === value;
      return { ...prev, partyType: value, partyId: stillMatches ? prev.partyId : '' };
    });
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (rupees(item.quantity) || 1) * rupees(item.unitPrice),
    0,
  );
  const discount = rupees(form.discount);
  const total = Math.max(0, subtotal - discount);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setItem = (index: number, key: keyof ItemRow) => (value: string) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
    setEditorOpen(true);
  };

  const openEdit = (row: InvoiceRecord) => {
    setEditing(row);
    setForm({
      kind: row.kind,
      partyType: row.partyType,
      partyId:
        typeof row.partyId === 'object' && row.partyId
          ? String(row.partyId._id)
          : String(row.partyId ?? ''),
      partyName: row.partyName,
      partyEmail: row.partyEmail ?? '',
      partyPhone: row.partyPhone ?? '',
      partyAddress: row.partyAddress ?? '',
      discount: row.discount ? String(row.discount) : '',
      issueDate: row.issueDate?.slice(0, 10) ?? '',
      dueDate: row.dueDate?.slice(0, 10) ?? '',
      paidAt: row.paidAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      paymentMode: row.paymentMode ?? 'BANK_TRANSFER',
      referenceNumber: row.referenceNumber ?? '',
      notes: row.notes ?? '',
    });
    setItems(
      row.lineItems.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })),
    );
    setEditorOpen(true);
  };

  /** Linking an account pre-fills the party's name and email. */
  const onPickAccount = (accountId: string) => {
    const account = users.find((candidate) => candidate.id === accountId);
    setForm((prev) => ({
      ...prev,
      partyId: accountId,
      partyName: account ? account.name : prev.partyName,
      partyEmail: account ? account.email : prev.partyEmail,
      // The party type follows the linked account's actual database role.
      partyType: account?.role ? normalizeRoleName(account.role) : prev.partyType,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const lineItems = items
      .filter((item) => item.description.trim() && rupees(item.unitPrice) > 0)
      .map((item) => ({
        description: item.description.trim(),
        quantity: rupees(item.quantity) || 1,
        unitPrice: rupees(item.unitPrice),
      }));

    if (lineItems.length === 0) {
      toast.error('Nothing to bill', 'Add at least one line item with a price.');
      return;
    }

    const isBill = form.kind === 'BILL';
    const payload = {
      partyType: form.partyType,
      partyId: form.partyId || undefined,
      partyName: form.partyName,
      partyEmail: form.partyEmail || undefined,
      partyPhone: form.partyPhone || undefined,
      partyAddress: form.partyAddress || undefined,
      lineItems,
      discount: form.discount || undefined,
      issueDate: form.issueDate || undefined,
      dueDate: !isBill ? form.dueDate || undefined : undefined,
      paidAt: isBill ? form.paidAt || undefined : undefined,
      paymentMode: isBill ? (form.paymentMode as never) : undefined,
      referenceNumber: isBill ? form.referenceNumber || undefined : undefined,
      notes: form.notes || undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateInvoice(editing._id, payload);
        toast.success('Document updated', 'The PDF has been regenerated to match.');
      } else {
        const created = await createInvoice({ ...payload, kind: form.kind });
        toast.success(
          isBill ? 'Payment bill generated' : 'Invoice generated',
          `${created.number} · ${inr(created.total)} for ${created.partyName}.`,
        );
      }
      setEditorOpen(false);
      setNextNumbers({});
      reload();
    } catch (thrown) {
      toast.error('Could not save', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const submitMarkPaid = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paying) return;

    setSaving(true);
    try {
      const result = await markInvoicePaid(paying._id, {
        paidAt: payForm.paidAt || undefined,
        paymentMode: payForm.paymentMode as never,
        referenceNumber: payForm.referenceNumber || undefined,
        generateBill: payForm.generateBill,
      });
      toast.success(
        'Invoice settled',
        result.bill
          ? `${paying.number} is paid — payment bill ${result.bill.number} generated.`
          : `${paying.number} is marked as paid.`,
      );
      setPaying(null);
      reload();
    } catch (thrown) {
      toast.error('Could not mark as paid', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: InvoiceRecord) => {
    if (
      !window.confirm(
        `Delete ${row.kind === 'BILL' ? 'payment bill' : 'invoice'} ${row.number} (${inr(row.total)})? The stored PDF is removed too.`,
      )
    ) {
      return;
    }
    try {
      await deleteInvoice(row._id);
      toast.success('Deleted', `${row.number} has been removed.`);
      reload();
    } catch (thrown) {
      toast.error('Could not delete', getErrorMessage(thrown));
    }
  };

  const download = async (row: InvoiceRecord) => {
    setDownloading(row._id);
    try {
      await downloadInvoicePdf(row._id, `${row.number}.pdf`);
    } catch (thrown) {
      toast.error('Download failed', getErrorMessage(thrown));
    } finally {
      setDownloading(null);
    }
  };

  /* -------------------------------- editor -------------------------------- */

  if (editorOpen) {
    const isBill = form.kind === 'BILL';

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Finance · Invoices & Bills"
          title={
            editing
              ? `Edit ${editing.number}`
              : `${isBill ? 'New payment bill' : 'New invoice'}${
                  nextNumbers[numberKey] ? ` — ${nextNumbers[numberKey]}` : ''
                }`
          }
          subtitle="The preview on the right is the exact document that will be generated."
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditorOpen(false)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button size="sm" loading={saving} onClick={(event) => void submit(event as never)}>
                {editing ? 'Save & regenerate PDF' : isBill ? 'Generate bill' : 'Generate invoice'}
              </Button>
            </div>
          }
        />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
          {/* form — pinned in place on desktop, scrolling within its own panel */}
          <form
            onSubmit={submit}
            className="glass-card min-w-0 space-y-4 p-4 sm:p-5 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto"
          >
            {!editing && (
              <div className="grid grid-cols-2 gap-2">
                {INVOICE_KINDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('kind')(value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      form.kind === value
                        ? 'border-white/40 bg-white/[0.12] text-white shadow-inner'
                        : 'border-white/10 text-slate-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {value === 'BILL' ? 'Payment bill' : 'Invoice'}
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                      {value === 'BILL' ? 'money received' : 'request payment'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectControl
                label="Party type"
                value={form.partyType}
                onChange={onPickPartyType}
                options={partyTypeOptions}
              />
              <SelectControl
                label="Linked account (optional)"
                value={form.partyId}
                onChange={onPickAccount}
                options={accountOptions}
              />
              <Input
                label="Party name"
                value={form.partyName}
                onChange={(event) => set('partyName')(event.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.partyEmail}
                onChange={(event) => set('partyEmail')(event.target.value)}
              />
              <Input
                label="Phone"
                value={form.partyPhone}
                onChange={(event) => set('partyPhone')(event.target.value)}
              />
              <Input
                label={isBill ? 'Bill date' : 'Invoice date'}
                type="date"
                value={form.issueDate}
                onChange={(event) => set('issueDate')(event.target.value)}
              />
            </div>

            <Input
              label="Address"
              value={form.partyAddress}
              onChange={(event) => set('partyAddress')(event.target.value)}
            />

            {/* ------------------------------ line items ------------------------------ */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Line items
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add item
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_52px_84px_28px] items-end gap-1.5 sm:grid-cols-[minmax(0,1fr)_60px_96px_30px] sm:gap-2"
                >
                  <Input
                    label={index === 0 ? 'Description' : ''}
                    value={item.description}
                    onChange={(event) => setItem(index, 'description')(event.target.value)}
                    placeholder="What this charge is for"
                  />
                  <Input
                    label={index === 0 ? 'Qty' : ''}
                    type="number"
                    min="0.001"
                    step="any"
                    value={item.quantity}
                    onChange={(event) => setItem(index, 'quantity')(event.target.value)}
                  />
                  <Input
                    label={index === 0 ? 'Price (₹)' : ''}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => setItem(index, 'unitPrice')(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) =>
                        prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
                      )
                    }
                    className="mb-1.5 grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Discount (₹, optional)"
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(event) => set('discount')(event.target.value)}
              />
              {!isBill ? (
                <Input
                  label="Due date (optional)"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => set('dueDate')(event.target.value)}
                />
              ) : (
                <Input
                  label="Paid on"
                  type="date"
                  value={form.paidAt}
                  onChange={(event) => set('paidAt')(event.target.value)}
                />
              )}
            </div>

            {isBill && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectControl
                  label="Payment mode"
                  value={form.paymentMode}
                  onChange={(value) => set('paymentMode')(value)}
                  options={PAYMENT_MODES.map((value) => ({ value, label: humanize(value) }))}
                />
                <Input
                  label="Reference number"
                  value={form.referenceNumber}
                  onChange={(event) => set('referenceNumber')(event.target.value)}
                  hint="Bank / UPI reference of the received payment"
                />
              </div>
            )}

            <Input
              label="Notes (optional)"
              value={form.notes}
              onChange={(event) => set('notes')(event.target.value)}
            />

            <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {isBill ? 'Total received' : 'Total due'} · GST not applicable
              </span>
              <span className="text-lg font-bold tabular-nums text-white">{inr(total)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {editing ? 'Save & regenerate PDF' : isBill ? 'Generate bill' : 'Generate invoice'}
              </Button>
            </div>
          </form>

          {/* ------------------------------- preview -------------------------------- */}
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Live preview — exactly as the PDF will be generated
            </p>
            <DocumentPreview
              form={form}
              items={items}
              subtotal={subtotal}
              discount={discount}
              total={total}
              number={editing?.number ?? nextNumbers[numberKey]}
            />
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------- list ---------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Invoices & Bills"
        subtitle="Raise an invoice before collecting money; issue the payment bill once it arrives. Documents stay editable — the PDF regenerates on every save."
        action={
          isSuperAdmin ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New document
            </Button>
          ) : undefined
        }
      />

      <RangeFilter
        range={range}
        onChange={setRange}
        extra={
          <>
            <SelectControl
              label="Type"
              value={kind}
              onChange={setKind}
              options={[
                { value: '', label: 'All types' },
                { value: 'INVOICE', label: 'Invoices' },
                { value: 'BILL', label: 'Payment bills' },
              ]}
            />
            <SelectControl
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'All statuses' },
                ...INVOICE_STATUSES.map((value) => ({ value, label: humanize(value) })),
              ]}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Party or number…"
                className="h-10 w-44 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/25"
              />
            </label>
          </>
        }
      />

      {loading ? (
        <>
          <CardGridSkeleton />
          <TableSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              icon={Clock}
              label="Awaiting payment"
              value={data.summary.outstandingAmount}
              format={inr}
              hint={`${data.summary.outstandingCount} open invoices`}
              tone="amber"
            />
            <FinanceCard
              icon={BadgeCheck}
              label="Invoices settled"
              value={data.summary.collectedAmount}
              format={inr}
              hint={`${data.summary.collectedCount} paid invoices`}
              tone="brand"
            />
            <FinanceCard
              icon={Receipt}
              label="Billed as received"
              value={data.summary.billAmount}
              format={inr}
              hint={`${data.summary.billCount} payment bills`}
              tone="sky"
            />
            <FinanceCard
              icon={FileText}
              label="Documents (filtered)"
              value={data.total}
              hint="in the current view"
              tone="violet"
            />
          </div>

          <FinanceTable<InvoiceRecord>
            rows={data.rows}
            rowKey={(row) => row._id}
            emptyTitle={
              kind === 'INVOICE'
                ? 'No invoices yet'
                : kind === 'BILL'
                  ? 'No payment bills yet'
                  : 'No documents yet'
            }
            emptyMessage="Generate your first invoice or payment bill with New document."
            maxHeight={640}
            columns={[
              {
                key: 'number',
                header: 'Number',
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <Pill tone={row.kind === 'BILL' ? 'gray' : 'blue'}>
                      {row.kind === 'BILL' ? 'Bill' : 'Invoice'}
                    </Pill>
                    <span className="font-mono text-xs font-semibold text-white">
                      {row.number}
                    </span>
                  </div>
                ),
              },
              {
                key: 'party',
                header: 'Party',
                render: (row) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{row.partyName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {humanize(row.partyType)}
                      {row.partyEmail ? ` · ${row.partyEmail}` : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'issued',
                header: 'Issued',
                hideOnMobile: true,
                render: (row) => (
                  <span className="whitespace-nowrap text-slate-300">
                    {formatDate(row.issueDate)}
                  </span>
                ),
              },
              {
                key: 'when',
                header: 'Due / Paid',
                hideOnMobile: true,
                render: (row) => (
                  <span className="whitespace-nowrap text-slate-400">
                    {row.kind === 'BILL' || row.status === 'PAID'
                      ? row.paidAt
                        ? `Paid ${formatDate(row.paidAt)}`
                        : '—'
                      : row.dueDate
                        ? `Due ${formatDate(row.dueDate)}`
                        : '—'}
                  </span>
                ),
              },
              {
                key: 'total',
                header: 'Total',
                numeric: true,
                render: (row) => (
                  <span className="font-semibold text-white">{inr(row.total)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                align: 'center',
                render: (row) => (
                  <Pill tone={statusTone(row.status)}>{humanize(row.status)}</Pill>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <span className="inline-flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void download(row)}
                      disabled={downloading === row._id}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                      title={`Download ${row.number}.pdf`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {isSuperAdmin && row.kind === 'INVOICE' && row.status === 'ISSUED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaying(row);
                          setPayForm((prev) => ({ ...prev, referenceNumber: '' }));
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        title="Mark as paid & generate bill"
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Edit (PDF regenerates on save)"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </span>
                ),
              },
            ]}
            footer={
              <>
                <TotalCell numeric={false} colSpan={2}>
                  Total (filtered)
                </TotalCell>
                <TotalCell numeric={false} hideOnMobile>
                  <span />
                </TotalCell>
                <TotalCell numeric={false} hideOnMobile>
                  <span />
                </TotalCell>
                <TotalCell>
                  {inr(data.rows.reduce((sum, row) => sum + row.total, 0))}
                </TotalCell>
                <TotalCell numeric={false} colSpan={2}>
                  <span />
                </TotalCell>
              </>
            }
          />
        </>
      )}

      {/* ------------------------------- mark paid ------------------------------- */}
      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Settle ${paying.number}` : ''}
      >
        {paying && (
          <form onSubmit={submitMarkPaid} className="space-y-4">
            <p className="text-sm text-slate-400">
              {inr(paying.total)} from <span className="text-white">{paying.partyName}</span> —
              record how the payment arrived.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Paid on"
                type="date"
                value={payForm.paidAt}
                onChange={(event) =>
                  setPayForm((prev) => ({ ...prev, paidAt: event.target.value }))
                }
                required
              />
              <SelectControl
                label="Payment mode"
                value={payForm.paymentMode}
                onChange={(value) => setPayForm((prev) => ({ ...prev, paymentMode: value }))}
                options={PAYMENT_MODES.map((value) => ({ value, label: humanize(value) }))}
              />
            </div>
            <Input
              label="Reference number"
              value={payForm.referenceNumber}
              onChange={(event) =>
                setPayForm((prev) => ({ ...prev, referenceNumber: event.target.value }))
              }
              hint="Bank / UPI reference so the transfer can be traced"
            />
            <label className="flex items-center gap-2.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={payForm.generateBill}
                onChange={(event) =>
                  setPayForm((prev) => ({ ...prev, generateBill: event.target.checked }))
                }
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-brand-500"
              />
              Also generate the payment bill PDF now
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPaying(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                Mark as paid
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
