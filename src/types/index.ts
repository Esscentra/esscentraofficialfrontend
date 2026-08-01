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

  /* ---------------------------- author profile ---------------------------- */
  // Shown on the byline and author card of any blog post this account writes.
  bio?: string;
  jobTitle?: string;
  socials?: {
    github?: string;
    x?: string;
    linkedin?: string;
    website?: string;
  };

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

