/** Tiny className combiner (no extra deps). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Canonical form of a role name, so comparisons survive however the role was
 * typed when it was created: "Freelance Performance Marketer" and
 * "freelance-performance-marketer" both become
 * "FREELANCE_PERFORMANCE_MARKETER".
 */
export function normalizeRoleName(role?: string): string {
  return (role ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

/** Roles with platform governance access (users + KYC review). */
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** True when the role can access admin-only areas (admin or super admin). */
export function isAdminRole(role?: string): boolean {
  return ADMIN_ROLES.includes(normalizeRoleName(role));
}

/** True only for the top-tier super admin (role types + super-admin assignment). */
export function isSuperAdminRole(role?: string): boolean {
  return normalizeRoleName(role) === 'SUPER_ADMIN';
}

/**
 * Read-only stakeholder: sees aggregated business KPIs on the dashboard,
 * never record-level CRM data (leads, contacts, deals, projects…).
 */
export function isInvestorRole(role?: string): boolean {
  return normalizeRoleName(role) === 'INVESTOR';
}

/* --------------------------- narrow-surface roles -------------------------- */

/**
 * Roles whose workspace is deliberately narrow, mapped to the exact `/app`
 * paths they may reach. Anything not listed is hidden from the sidebar,
 * dropped from the Overview cards, and redirected away from when the URL is
 * typed by hand.
 *
 * Personal screens (`/profile`, `/kyc`) sit outside `/app` and stay available
 * to everyone — a contractor still has to manage their own account.
 *
 * Roles absent from this map are unrestricted here and fall back to the
 * admin / super-admin / staff checks above.
 */
export const RESTRICTED_ROLE_PATHS: Record<string, string[]> = {
  /**
   * Contract marketer: their own overview plus the tasks assigned to them.
   *
   * Deliberately NOT `/app/projects` — company projects are internal. The
   * whole engagement (contract, agreements, deadlines, weekly reports) hangs
   * off their tasks instead.
   */
  FREELANCE_PERFORMANCE_MARKETER: ['/app', '/app/marketer', '/app/tickets'],

  /**
   * Client: their own portal, the shared support desk, and nothing else.
   *
   * `/app/client` covers every child route, so new portal pages are reachable
   * without editing this list — while the internal project board, the finance
   * screens and the CRM stay out of reach even if the URL is typed by hand.
   * The matching server-side gate is `resolveAccountId`, which is what stops
   * one client reading another's company.
   */
  CLIENT: ['/app', '/app/client', '/app/tickets'],

  /**
   * Read-only stakeholder: their investor dashboard and nothing else.
   *
   * `/app/investor` covers every child route, so new investor pages are
   * reachable without editing this list — while the admin areas (users, KYC
   * review, revenue entry, distributions) stay out of reach even if the URL
   * is typed by hand. The matching server-side gate is `resolveInvestorId`,
   * which is what actually stops one investor reading another's position.
   */
  INVESTOR: ['/app', '/app/investor'],
};

/** The outside contract-marketer role, by its canonical name. */
export const MARKETER_ROLE = 'FREELANCE_PERFORMANCE_MARKETER';

/** The client role, by its canonical name. */
export const CLIENT_ROLE = 'CLIENT';

/** True when this account is a client of the company. */
export function isClientRole(role?: string): boolean {
  return normalizeRoleName(role) === CLIENT_ROLE;
}

/**
 * True for the contract marketer. They get their own Overview screen and a
 * read-only Projects section — only a super admin creates or edits projects.
 */
export function isMarketerRole(role?: string): boolean {
  return normalizeRoleName(role) === MARKETER_ROLE;
}

/** Allowed `/app` paths for a role, or `null` when the role is unrestricted. */
export function allowedAppPaths(role?: string): string[] | null {
  return RESTRICTED_ROLE_PATHS[normalizeRoleName(role)] ?? null;
}

/** True when the role gets a hand-picked list of pages instead of the full app. */
export function isRestrictedRole(role?: string): boolean {
  return allowedAppPaths(role) !== null;
}

/**
 * True when `role` may open `path` (an `/app` route).
 *
 * `/app` matches the index only; every other entry also covers its children,
 * so `/app/projects` grants `/app/projects/:id` without listing each one.
 */
export function canAccessAppPath(role: string | undefined, path: string): boolean {
  const allowed = allowedAppPaths(role);
  if (!allowed) return true;

  const clean = path.replace(/\/+$/, '') || '/app';
  return allowed.some((p) =>
    p === '/app' ? clean === '/app' : clean === p || clean.startsWith(`${p}/`),
  );
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

/**
 * True when a request failed because the route or record does not exist.
 *
 * Used to degrade quietly instead of shouting: a feature whose backend hasn't
 * been deployed yet should read as "unavailable", not as a red error banner.
 */
export function isNotFound(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    (e as { status?: number }).status === 404
  );
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
