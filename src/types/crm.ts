/**
 * Frontend types mirroring the backend CRM modules.
 * These describe the shape of data the API returns / accepts — used by the
 * UI only. (No API is wired yet; you'll plug requests in yourself.)
 */

/* ----------------------------------- Lead ---------------------------------- */
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status: LeadStatus;
  /** Set when the lead was promoted from an inquiry — links to its CRM Account. */
  accountId?: string;
  notes?: string;
  createdAt?: string;
}

/* ------------------------------- Opportunity ------------------------------- */
export type OpportunityStage =
  | 'NEW'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface Opportunity {
  id: string;
  /** The account (company) this deal belongs to — required by the backend. */
  accountId: string;
  /** Optional contact at that account. */
  contactId?: string;
  title: string;
  description?: string;
  amount: number;
  probability: number;
  stage: OpportunityStage;
  expectedCloseDate?: string;
  createdAt?: string;
}

/* --------------------------------- Project --------------------------------- */
export type ProjectStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

/** Lifecycle of the contract with the assigned contractor. */
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

/** Where the contractor's money stands. */
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export type ProjectDocumentCategory = 'AGREEMENT' | 'INVOICE' | 'REPORT' | 'OTHER';

export type DeliverableStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * A PDF attached to the project by a super admin.
 *
 * The storage URL is deliberately absent — the backend never sends it. Files
 * are fetched through the authenticated download endpoint so permission is
 * re-checked on every request.
 */
export interface ProjectDocument {
  id: string;
  title: string;
  category: ProjectDocumentCategory;
  originalName?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  /** The file's storage account is unreachable — disable the download. */
  unavailable?: boolean;
}

/** A unit of work owed on the project. */
export interface Deliverable {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: DeliverableStatus;
  completedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdAt?: string;

  /** Populated names from the backend. */
  ownerName?: string;
  accountName?: string;

  /* ------------------------- contractor assignment ------------------------ */
  assignedMarketerId?: string;
  assignedMarketerName?: string;
  contractStatus: ContractStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus: PaymentStatus;

  /** Empty for anyone who isn't an admin or the assigned contractor. */
  documents: ProjectDocument[];
  deliverables: Deliverable[];
}

/** A weekly progress report filed by the contractor. */
export interface WeeklyReport {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  achievements?: string;
  blockers?: string;
  submittedAt?: string;
  marketerName?: string;
}

/** A dated item the contractor's overview counts down to. */
export interface UpcomingDeadline {
  type: 'DELIVERABLE' | 'CONTRACT_END';
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  daysRemaining: number | null;
  overdue: boolean;
}

/** Everything the contractor's Overview screen renders, from one call. */
export interface MarketerOverview {
  contractStatus: ContractStatus | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  daysRemaining: number | null;
  paymentStatus: PaymentStatus | null;

  currentProject: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    budget: number | null;
    documentCount: number;
  } | null;
  projectCount: number;

  weeklyReportsSubmitted: number;
  lastReportWeekStart: string | null;
  pendingDeliverables: number;
  totalDeliverables: number;
  completedDeliverables: number;

  upcomingDeadlines: UpcomingDeadline[];

  unreadNotifications: number;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

/* ----------------------------------- Task ---------------------------------- */
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt?: string;
}

/* --------------------------------- Contact --------------------------------- */
export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  notes?: string;
  /** Parent account this contact belongs to. */
  accountId?: string;
  accountName?: string;
  createdAt?: string;
}

/* --------------------------------- Account --------------------------------- */
/**
 * A CRM company/organization (the business you work with) — parent of
 * Contacts, Opportunities and Projects. Mirrors the backend Account model.
 */
export interface Account {
  id: string;
  companyName: string;
  website?: string;
  industry?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logo?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  /** Populated owner name from the backend (ownerId → user). */
  ownerName?: string;
  createdAt?: string;
}

/* ----------------------------- Contact inquiry ----------------------------- */
export type InquiryStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  status: InquiryStatus;
  isConverted: boolean;
  createdAt?: string;
}

/* ----------------------------------- Blog ---------------------------------- */
export type BlogStatus = 'DRAFT' | 'PUBLISHED';

export interface BlogPost {
  id: string;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  tags: string[];
  status: BlogStatus;
  views?: number;
  publishedAt?: string;
  createdAt?: string;
}

/* ----------------------------------- Role ---------------------------------- */
export interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

/* -------------------------------- Newsletter ------------------------------- */
export interface NewsletterSubscriber {
  id: string;
  email: string;
  isSubscribed: boolean;
  subscribedAt?: string;
}
