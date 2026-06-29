import api from './api';
import { ApiError } from './api';
import type { ApiResponse, KycDocumentType, KycRecord } from '@/types';

/** Raw KYC document as returned by Mongo (uses _id). */
interface RawKyc {
  _id?: string;
  id?: string;
  fullName: string;
  dateOfBirth: string;
  documentType: KycDocumentType;
  documentNumber: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieUrl?: string;
  status: KycRecord['status'];
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
}

function mapKyc(raw: RawKyc): KycRecord {
  return {
    id: raw.id ?? raw._id ?? '',
    fullName: raw.fullName,
    dateOfBirth: raw.dateOfBirth,
    documentType: raw.documentType,
    documentNumber: raw.documentNumber,
    frontImageUrl: raw.frontImageUrl,
    backImageUrl: raw.backImageUrl,
    selfieUrl: raw.selfieUrl,
    status: raw.status,
    rejectionReason: raw.rejectionReason,
    verifiedAt: raw.verifiedAt,
    createdAt: raw.createdAt,
  };
}

/**
 * GET /kyc/mekyc — the current user's KYC record.
 * Returns null when nothing has been submitted yet (backend 404).
 */
export async function getMyKyc(): Promise<KycRecord | null> {
  try {
    const { data } = await api.get<ApiResponse<RawKyc>>('/kyc/mekyc');
    return mapKyc(data.data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface SubmitKycInput {
  fullName: string;
  dateOfBirth: string;
  documentType: KycDocumentType;
  documentNumber: string;
  frontImage?: File;
  backImage?: File;
  selfieImage?: File;
}

/**
 * POST /kyc (multipart) — submit KYC documents for verification.
 */
export async function submitKyc(input: SubmitKycInput): Promise<KycRecord> {
  const form = new FormData();
  form.append('fullName', input.fullName);
  form.append('dateOfBirth', input.dateOfBirth);
  form.append('documentType', input.documentType);
  form.append('documentNumber', input.documentNumber);
  if (input.frontImage) form.append('frontImage', input.frontImage);
  if (input.backImage) form.append('backImage', input.backImage);
  if (input.selfieImage) form.append('selfieImage', input.selfieImage);

  const { data } = await api.post<ApiResponse<RawKyc>>('/kyc', form, {
    headers: { 'Content-Type': undefined } as never,
  });

  return mapKyc(data.data);
}
