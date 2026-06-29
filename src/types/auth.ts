/** Roles returned by the Esscentra backend. */
export type AccountRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'USER' | 'CLIENT';

/** Account lifecycle status. */
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

/* ----------------------------------- KYC ----------------------------------- */

export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
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
