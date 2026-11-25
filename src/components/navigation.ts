import {
  BadgeCheck,
  BarChart3,
  Building,
  Building2,
  Coins,
  FileText,
  FolderArchive,
  FolderKanban,
  Github,
  HandCoins,
  History,
  IndianRupee,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Mail,
  MessageSquare,
  PieChart,
  Receipt,
  ScrollText,
  ShieldHalf,
  Target,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import {
  canAccessAppPath,
  isAdminRole,
  isClientRole,
  isInvestorRole,
  isMarketerRole,
  isSuperAdminRole,
} from '@/lib/utils';

/**
 * Who may see a link. The server enforces every one of these again — this
 * only decides what the sidebar shows.
 */
export type NavAccess =
  | 'all'
  | 'staff' // anyone on the internal team (not investor / client / contractor)
  | 'admin'
  | 'superAdmin'
  | 'investor'
  | 'marketer'
  | 'client';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Users;
  access: NavAccess;
  /** Match `to` exactly instead of as a prefix. */
  end?: boolean;
  /**
   * Other paths that light this link up. A sidebar entry that opens a group
   * of tabbed pages (see SECTION_TABS) lists every page of the group here.
   */
  match?: string[];
}

export interface NavSection {
  id: string;
  /** Omitted for the untitled top block (Overview). */
  label?: string;
  items: NavItem[];
}

/* -------------------------------------------------------------------------- */
/*                                 Sidebar                                    */
/* -------------------------------------------------------------------------- */

const INVESTOR_PERFORMANCE = ['/app/investor/revenue', '/app/investor/expenses', '/app/investor/profit', '/app/investor/reports'];
const INVESTOR_STAKE = ['/app/investor/valuation', '/app/investor/share-value', '/app/investor/equity', '/app/investor/roi'];
const INVESTOR_MONEY = ['/app/investor/timeline', '/app/investor/payments', '/app/investor/records'];
const INVESTOR_DOCS = ['/app/investor/documents', '/app/investor/notifications'];

/**
 * The sidebar, grouped by job rather than sorted A→Z. Each role sees only
 * the links it may open, and a section with no visible link is dropped.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    items: [{ to: '/app', label: 'Overview', icon: LayoutDashboard, access: 'all', end: true }],
  },

  /* ---------------------------- investor -------------------------------- */
  {
    id: 'investor',
    items: [
      { to: INVESTOR_PERFORMANCE[0], label: 'Performance', icon: BarChart3, access: 'investor', match: INVESTOR_PERFORMANCE },
      { to: INVESTOR_STAKE[0], label: 'My stake', icon: PieChart, access: 'investor', match: INVESTOR_STAKE },
      { to: INVESTOR_MONEY[0], label: 'My money', icon: Coins, access: 'investor', match: INVESTOR_MONEY },
      { to: INVESTOR_DOCS[0], label: 'Documents', icon: FolderArchive, access: 'investor', match: INVESTOR_DOCS },
    ],
  },

  /* --------------------------- contractor ------------------------------- */
  {
    id: 'marketer',
    items: [
      { to: '/app/marketer/tasks', label: 'My tasks', icon: ListChecks, access: 'marketer' },
      { to: '/app/marketer/documents', label: 'Documents', icon: FolderArchive, access: 'marketer' },
      { to: '/app/marketer/payments', label: 'Payments', icon: Coins, access: 'marketer' },
      { to: '/app/tickets', label: 'Support tickets', icon: LifeBuoy, access: 'marketer' },
    ],
  },

  /* ----------------------------- client --------------------------------- */
  {
    id: 'client',
    items: [
      { to: '/app/client/projects', label: 'My projects', icon: FolderKanban, access: 'client' },
      { to: '/app/client/documents', label: 'Documents', icon: FolderArchive, access: 'client' },
      { to: '/app/tickets', label: 'Support tickets', icon: LifeBuoy, access: 'client' },
    ],
  },

  /* ------------------------- internal team ------------------------------ */
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { to: '/app/inquiries', label: 'Inquiries', icon: MessageSquare, access: 'staff' },
      { to: '/app/leads', label: 'Leads', icon: Users, access: 'staff' },
      { to: '/app/opportunities', label: 'Opportunities', icon: Target, access: 'staff' },
      { to: '/app/accounts', label: 'Accounts', icon: Building, access: 'staff' },
      { to: '/app/contacts', label: 'Contacts', icon: Building2, access: 'staff' },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    items: [
      { to: '/app/projects', label: 'Projects', icon: FolderKanban, access: 'staff' },
      { to: '/app/tasks', label: 'Tasks', icon: ListChecks, access: 'staff' },
      { to: '/app/tickets', label: 'Support tickets', icon: LifeBuoy, access: 'admin' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    items: [
      { to: '/app/finance/invoices', label: 'Invoices & bills', icon: ScrollText, access: 'admin' },
      { to: '/app/finance/revenue', label: 'Revenue', icon: IndianRupee, access: 'admin' },
      { to: '/app/finance/expenses', label: 'Expenses', icon: Wallet, access: 'admin' },
      { to: '/app/finance/contractor-payments', label: 'Contractor pay', icon: HandCoins, access: 'admin' },
    ],
  },
  {
    id: 'investors',
    label: 'Investors',
    items: [
      { to: '/app/commitments', label: 'Commitments', icon: HandCoins, access: 'admin' },
      { to: '/app/investments', label: 'Money received', icon: Receipt, access: 'admin' },
      { to: '/app/finance/distributions', label: 'Distributions', icon: Coins, access: 'admin' },
      { to: '/app/finance/documents', label: 'Investor documents', icon: FolderArchive, access: 'admin' },
      { to: '/app/kyc-review', label: 'KYC review', icon: BadgeCheck, access: 'admin' },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    items: [
      { to: '/app/finance/valuation', label: 'Valuation', icon: Building2, access: 'admin' },
      { to: '/app/finance/audit', label: 'Audit trail', icon: History, access: 'admin' },
      { to: '/app/blog', label: 'Blog', icon: FileText, access: 'admin' },
      { to: '/app/newsletter', label: 'Newsletter', icon: Mail, access: 'admin' },
      { to: '/app/github', label: 'GitHub', icon: Github, access: 'superAdmin' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { to: '/app/users', label: 'Users', icon: UserCog, access: 'admin' },
      { to: '/app/roles', label: 'Roles', icon: ShieldHalf, access: 'superAdmin' },
      { to: '/app/finance/clients', label: 'Clients', icon: Building, access: 'superAdmin' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                      Tabs for grouped (hub) pages                          */
/* -------------------------------------------------------------------------- */

export interface SectionTab {
  to: string;
  label: string;
}

/**
 * Pages that share one sidebar entry and switch between each other with a
 * tab bar instead. Each page keeps its own URL, so bookmarks still work.
 */
export const SECTION_TABS: SectionTab[][] = [
  [
    { to: '/app/investor/revenue', label: 'Revenue' },
    { to: '/app/investor/expenses', label: 'Expenses' },
    { to: '/app/investor/profit', label: 'Profit' },
    { to: '/app/investor/reports', label: 'Monthly reports' },
  ],
  [
    { to: '/app/investor/valuation', label: 'Valuation' },
    { to: '/app/investor/share-value', label: 'Share value' },
    { to: '/app/investor/equity', label: 'Equity progress' },
    { to: '/app/investor/roi', label: 'ROI calculator' },
  ],
  [
    { to: '/app/investor/timeline', label: 'Investments' },
    { to: '/app/investor/payments', label: 'Payments' },
    { to: '/app/investor/records', label: 'Fund usage' },
  ],
  [
    { to: '/app/investor/documents', label: 'Documents' },
    { to: '/app/investor/notifications', label: 'Updates' },
  ],
];

/** The tab group the current page belongs to, if any. */
export function tabsFor(pathname: string): SectionTab[] | null {
  const path = pathname.replace(/\/+$/, '');
  return SECTION_TABS.find((group) => group.some((tab) => tab.to === path)) ?? null;
}

/* -------------------------------------------------------------------------- */
/*                                  Access                                    */
/* -------------------------------------------------------------------------- */

export function canSee(role: string | undefined, item: NavItem): boolean {
  // Narrow-surface roles (RESTRICTED_ROLE_PATHS) get only their listed pages.
  // Checked first so an access flag can never widen it.
  if (!canAccessAppPath(role, item.to)) return false;
  switch (item.access) {
    case 'all':
      return true;
    case 'superAdmin':
      return isSuperAdminRole(role);
    case 'admin':
      return isAdminRole(role);
    case 'investor':
      return isInvestorRole(role);
    case 'marketer':
      return isMarketerRole(role);
    case 'client':
      return isClientRole(role);
    case 'staff':
      return !isInvestorRole(role) && !isMarketerRole(role) && !isClientRole(role);
  }
}

/** The sidebar for one role: hidden links dropped, empty sections dropped. */
export function sectionsFor(role: string | undefined): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSee(role, item)),
  })).filter((section) => section.items.length > 0);
}

/** True when `pathname` is this link's page (or one of its grouped pages). */
export function isItemActive(item: NavItem, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  const matches = (target: string, exact?: boolean) =>
    exact ? path === target : path === target || path.startsWith(`${target}/`);
  if (item.match?.some((m) => matches(m))) return true;
  return matches(item.to, item.end);
}
