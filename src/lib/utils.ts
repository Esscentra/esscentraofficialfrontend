/** Tiny className combiner (no extra deps). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Roles with platform governance access (users + KYC review). */
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** True when the role can access admin-only areas (admin or super admin). */
export function isAdminRole(role?: string): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/** True only for the top-tier super admin (role types + super-admin assignment). */
export function isSuperAdminRole(role?: string): boolean {
  return role === 'SUPER_ADMIN';
}

/** Deterministic gradient avatar from a string (used when no photo is set). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Pull a user-facing message off any thrown value (ApiError carries the backend message). */
export function getErrorMessage(e: unknown, fallback = 'Something went wrong.'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Strength score 0–4 plus a label, used by the password meter. */
export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12 && score >= 3) score = 4;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}
