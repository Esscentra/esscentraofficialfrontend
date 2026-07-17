import api from './api';
import { downloadFromApi } from './download';
import type { ApiResponse } from '@/types';

/* ------------------------------ Investments ------------------------------ */
/**
 * Investment records: how much an INVESTOR has put in, plus the invoice /
 * receipt PDF the admin uploaded for each contribution (stored on Cloudinary).
 *
 * Endpoints:
 *   GET    /investments/my   → own records + total   (any authenticated user)
 *   GET    /investments      → all records           (admin)
 *   POST   /investments      → create (multipart, field "invoice" = PDF) (admin)
 *   PATCH  /investments/:id  → update / replace PDF  (admin)
 *   DELETE /investments/:id  → remove                (admin)
 */

interface RawRef {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface RawCommitmentRef {
  _id?: string;
  id?: string;
  title?: string;
  committedAmount?: number;
}

interface RawInvestment {
  _id?: string;
  id?: string;
  investorId?: RawRef | string;
  commitmentId?: RawCommitmentRef | string;
  amount: number;
  currency?: string;
  investedAt?: string;
  notes?: string;
  invoiceUrl?: string;
  invoiceOriginalName?: string;
  invoiceUploadedAt?: string;
  createdAt?: string;
}

export interface InvestorRef {
  id: string;
  name: string;
  email: string;
}

export interface Investment {
  id: string;
  investor?: InvestorRef;
  /** Present when this payment is an installment of a commitment. */
  commitment?: { id: string; title: string };
  amount: number;
  currency: string;
  investedAt?: string;
  notes?: string;
  invoiceUrl?: string;
  /** Original filename of the invoice (used for a clean download name). */
  invoiceName?: string;
  invoiceUploadedAt?: string;
  createdAt?: string;
}

function refName(ref?: RawRef): string {
  return [ref?.firstName, ref?.lastName].filter(Boolean).join(' ').trim() || ref?.email || '';
}

function mapInvestment(raw: RawInvestment): Investment {
  const investorRef = typeof raw.investorId === 'object' ? raw.investorId : undefined;
  const commitmentRef = typeof raw.commitmentId === 'object' ? raw.commitmentId : undefined;
  return {
    id: raw.id ?? raw._id ?? '',
    commitment: commitmentRef
      ? {
          id: commitmentRef.id ?? commitmentRef._id ?? '',
          title: commitmentRef.title ?? 'Commitment',
        }
      : undefined,
    investor: investorRef
      ? {
          id: investorRef.id ?? investorRef._id ?? '',
          name: refName(investorRef),
          email: investorRef.email ?? '',
        }
      : undefined,
    amount: raw.amount,
    currency: raw.currency ?? 'INR',
    investedAt: raw.investedAt,
    notes: raw.notes,
    invoiceUrl: raw.invoiceUrl,
    invoiceName: raw.invoiceOriginalName,
    invoiceUploadedAt: raw.invoiceUploadedAt,
    createdAt: raw.createdAt,
  };
}

/** GET /investments  (admin) — every investment, newest first. */
export async function listInvestments(): Promise<Investment[]> {
  const { data } = await api.get<ApiResponse<RawInvestment[]>>('/investments');
  return (data.data ?? []).map(mapInvestment);
}

export interface MyInvestments {
  items: Investment[];
  totalInvested: number;
  count: number;
}

/** GET /investments/my — the logged-in investor's own records + total. */
export async function listMyInvestments(): Promise<MyInvestments> {
  const { data } = await api.get<
    ApiResponse<{ investments: RawInvestment[]; totalInvested: number; count: number }>
  >('/investments/my');
  return {
    items: (data.data?.investments ?? []).map(mapInvestment),
    totalInvested: data.data?.totalInvested ?? 0,
    count: data.data?.count ?? 0,
  };
}

export interface InvestmentInput {
  investorId: string;
  /** Link this payment to a commitment ('' detaches it). */
  commitmentId?: string;
  amount: number;
  investedAt?: string;
  notes?: string;
  /** Optional invoice/receipt PDF. */
  invoice?: File;
}

function toForm(input: Partial<InvestmentInput>): FormData {
  const form = new FormData();
  if (input.investorId) form.append('investorId', input.investorId);
  if (input.commitmentId !== undefined) form.append('commitmentId', input.commitmentId);
  if (input.amount !== undefined) form.append('amount', String(input.amount));
  if (input.investedAt) form.append('investedAt', input.investedAt);
  if (input.notes !== undefined) form.append('notes', input.notes);
  if (input.invoice) form.append('invoice', input.invoice);
  return form;
}

/** POST /investments  (admin, multipart) */
export async function createInvestment(input: InvestmentInput): Promise<Investment> {
  const { data } = await api.post<ApiResponse<RawInvestment>>('/investments', toForm(input), {
    headers: { 'Content-Type': undefined } as never,
  });
  return mapInvestment(data.data);
}

/** PATCH /investments/:id  (admin, multipart — sending `invoice` replaces the PDF) */
export async function updateInvestment(
  id: string,
  input: Partial<InvestmentInput>,
): Promise<Investment> {
  const { data } = await api.patch<ApiResponse<RawInvestment>>(
    `/investments/${id}`,
    toForm(input),
    { headers: { 'Content-Type': undefined } as never },
  );
  return mapInvestment(data.data);
}

/** DELETE /investments/:id  (admin) */
export async function deleteInvestment(id: string): Promise<void> {
  await api.delete(`/investments/${id}`);
}

/**
 * Download an investment's invoice PDF with its original filename
 * (e.g. "yasowant.pdf"). Streams through the backend so the browser saves the
 * real name instead of the storage id.
 */
export async function downloadInvoice(
  investmentId: string,
  filename = 'invoice.pdf',
): Promise<void> {
  await downloadFromApi(`/investments/${investmentId}/invoice`, filename);
}
