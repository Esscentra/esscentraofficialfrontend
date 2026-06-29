import api from './api';
import type { ApiResponse, RegisteredAccount, User } from '@/types';

/* --------------------------------- Register --------------------------------- */

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  account: RegisteredAccount;
  message: string;
}

export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  const { data } = await api.post<ApiResponse<RegisteredAccount>>('/auth/register', {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  return { account: data.data, message: data.message };
}

/* ----------------------------- Account mapping ------------------------------ */

/** Raw account shape returned by /auth/login, /auth/me and /users/profile. */
export interface RawAccount {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  status?: string;
  kycStatus?: string;
  emailVerified?: boolean;
  profileImage?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  createdAt?: string;
}

export function mapAccount(raw: RawAccount): User {
  const name = [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim();
  return {
    id: raw.id,
    name: name || raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    role: raw.role ?? 'USER',
    status: raw.status,
    kycStatus: raw.kycStatus,
    emailVerified: !!raw.emailVerified,
    avatarUrl: raw.profileImage ?? raw.avatarUrl ?? undefined,
    phone: raw.phone ?? undefined,
    bio: raw.bio ?? undefined,
    createdAt: raw.createdAt,
  };
}

/* ----------------------------------- Login ---------------------------------- */

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * POST /auth/login
 * On success the backend sets httpOnly access + refresh cookies and returns the user.
 */
export async function login(input: LoginInput): Promise<User> {
  const { data } = await api.post<ApiResponse<{ user: RawAccount }>>('/auth/login', {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  return mapAccount(data.data.user);
}

/* ------------------------------------ Me ------------------------------------ */

/** GET /auth/me — reads the access cookie and returns the current user. */
export async function fetchMe(): Promise<User> {
  const { data } = await api.get<ApiResponse<RawAccount>>('/auth/me');
  return mapAccount(data.data);
}

/* ---------------------------------- Refresh --------------------------------- */

/** POST /auth/refresh-token — rotates the cookie token pair. */
export async function refreshSession(): Promise<void> {
  await api.post('/auth/refresh-token');
}

/* ---------------------------------- Logout ---------------------------------- */

/** POST /auth/logout — revokes the refresh token and clears cookies. */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/* ------------------------------ Email / password ----------------------------- */

/** GET /auth/verify-email/:token — confirm an email address. Returns the server message. */
export async function verifyEmail(token: string): Promise<string> {
  const { data } = await api.get<ApiResponse<null>>(
    `/auth/verify-email/${encodeURIComponent(token)}`,
  );
  return data.message;
}

/** POST /auth/forgot-password — request a reset link (always succeeds to avoid email enumeration). */
export async function forgotPassword(email: string): Promise<string> {
  const { data } = await api.post<ApiResponse<null>>('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
  return data.message;
}

/** POST /auth/reset-password/:token — set a new password using the emailed token. */
export async function resetPassword(token: string, password: string): Promise<string> {
  const { data } = await api.post<ApiResponse<null>>(
    `/auth/reset-password/${encodeURIComponent(token)}`,
    { password },
  );
  return data.message;
}

/** POST /auth/change-password — change the signed-in user's password. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const { data } = await api.post<ApiResponse<null>>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data.message;
}
