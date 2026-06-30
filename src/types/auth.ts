/** Roles returned by the Esscentra backend. */
export type AccountRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'USER' | 'CLIENT';

/** Account lifecycle status (matches the backend User model enum). */
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

/* ----------------------------------- KYC ----------------------------------- */

export type KycStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';
export type KycDocumentType = 'AADHAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE';

export interface KycRecord {
  id: string;
  fullName: string;
  dateOfBirth: string;
  documentType: KycDocumentType;
  documentNumber: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieUrl?: string;
  status: KycStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt?: string;
}

/** Minimal account info populated on an admin KYC submission. */
export interface KycSubmitter {
  id: string;
  name: string;
  email: string;
}

/**
 * A KYC record as seen by an admin reviewer (GET /kyc).
 * Adds the submitting user and who verified it on top of KycRecord.
 */
export interface KycSubmission extends KycRecord {
  user?: KycSubmitter;
  verifiedByName?: string;
}

/**
 * Account object returned by `POST /auth/register`.
 * Mirrors the backend response exactly.
 */
export interface RegisteredAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AccountRole;
  emailVerified: boolean;
  status: AccountStatus;
}
