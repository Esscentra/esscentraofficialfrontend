export interface User {
  id: string;
  /** Display name, derived from firstName + lastName when they exist. */
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  /** Role name as returned by the backend (kept as string for flexibility). */
  role: string;
  status?: string;
  kycStatus?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  phone?: string;
  bio?: string;
  createdAt?: string;
}

export * from './auth';
export * from './crm';

/** Standard backend envelope: { statusCode, success, message, data } */
export interface ApiResponse<T = unknown> {
  statusCode?: number;
  success: boolean;
  message: string;
  data: T;
}

