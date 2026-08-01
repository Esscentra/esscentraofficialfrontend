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
/**
 * A company project: internal work with an owner, budget and timeline.
 *
 * Contractor engagements do NOT live here — contracts, agreements, invoices
 * and weekly reports hang off the Task a contractor is assigned. A task may
 * reference a project for context; the project carries no contract data.
 */
export type ProjectStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

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

  /** How many tasks are filed under this project. */
  taskCount?: number;
}

/* ----------------------------------- Task ---------------------------------- */
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Lifecycle of the contract with the assigned contractor. */
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

/** Where the contractor's money stands. */
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export type TaskDocumentCategory = 'AGREEMENT' | 'INVOICE' | 'REPORT' | 'OTHER';

/**
 * A PDF attached to the task by an admin.
 *
 * The storage URL is deliberately absent — the backend never sends it. Files
 * are fetched through the authenticated download endpoint so permission is
 * re-checked on every request.
 */
export interface TaskDocument {
  id: string;
  title: string;
  category: TaskDocumentCategory;
  originalName?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  /** The file's storage account is unreachable — disable the download. */
  unavailable?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;

  /** Who owes the work. For an engagement, the contract marketer. */
  assignedTo?: string;
  assignedToName?: string;
  createdByName?: string;

  /** Optional company project this task sits under. */
  projectId?: string;
  projectName?: string;

  /* ------------------------------ engagement ----------------------------- */
  // Only meaningful when the assignee is an outside contractor; internal
  // to-dos leave these at their defaults and the UI hides them.
  contractStatus: ContractStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  paymentStatus: PaymentStatus;

  /** Empty for anyone who isn't an admin or the assignee. */
  documents: TaskDocument[];
}

/** A weekly progress report filed by the contractor against a task. */
export interface WeeklyReport {
  id: string;
  taskId: string;
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
  /** The tasks are the deliverables, so most deadlines are task due dates. */
  type: 'TASK' | 'CONTRACT_END';
  id: string;
  title: string;
  taskId: string;
  projectName: string | null;
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

  currentTask: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    projectName: string | null;
    documentCount: number;
  } | null;
  taskCount: number;

  weeklyReportsSubmitted: number;
  lastReportWeekStart: string | null;
  /** Unfinished tasks — the tasks ARE the deliverables. */
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

/**
 * SCHEDULED is a distinct state, not a dated draft: a cron job flips it to
 * PUBLISHED when the time arrives. ARCHIVED keeps the post and its URL but
 * pulls it from every public listing.
 */
export type BlogStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

/** A heading in the post body, used for the table of contents. */
export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

/** The byline. Lives on the author's User account, not a separate record. */
export interface BlogAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  socials?: {
    github?: string;
    x?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  /** How many posts reference it — a category in use cannot be deleted. */
  postCount?: number;
}

export interface BlogSeries {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  isActive?: boolean;
  postCount?: number;
}

/** A sibling post in the same series, for prev/next navigation. */
export interface SeriesPost {
  id: string;
  title: string;
  slug: string;
  seriesOrder?: number;
  readingMinutes?: number;
  publishedAt?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** GitHub-flavoured Markdown. Absent from list responses. */
  content?: string;

  featuredImage?: string;
  featuredImageAlt?: string;
  ogImage?: string;

  category?: BlogCategory;
  categoryId?: string;
  author?: BlogAuthor;
  authorId?: string;
  tags: string[];

  series?: BlogSeries;
  seriesId?: string;
  seriesOrder?: number;

  seoTitle?: string;
  seoDescription?: string;
  /** Points search engines at the original when this is a cross-post. */
  canonicalUrl?: string;

  status: BlogStatus;
  publishedAt?: string;
  scheduledFor?: string;

  /** Derived server-side from the Markdown — read-only. */
  readingMinutes: number;
  wordCount: number;
  toc: TocEntry[];

  /** Only returned to admins; powers the shareable draft link. */
  previewToken?: string;

  views: number;
  createdAt?: string;
  updatedAt?: string;

  /** Present only on the public single-post response. */
  seriesPosts?: SeriesPost[];
  related?: BlogPost[];
}

/** A tag with its usage count, from GET /blog/tags. */
export interface BlogTag {
  tag: string;
  count: number;
}

/** Pagination envelope returned alongside list responses. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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
  unsubscribedAt?: string;
  /** Last time a newsletter email actually reached this address. */
  lastSentAt?: string;
}

export interface NewsletterStats {
  active: number;
  unsubscribed: number;
  total: number;
}

/** SCHEDULED = the Tuesday/Wednesday cron. MANUAL = an admin pressed send. */
export type CampaignSource = 'SCHEDULED' | 'MANUAL';

/**
 * SENDING   — in flight (a stuck row means the process died mid-send).
 * COMPLETED — every subscriber was attempted.
 * SKIPPED   — deliberately not sent; `reason` says why.
 * FAILED    — the run broke before it could attempt anyone.
 */
export type CampaignStatus = 'SENDING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';

/** One newsletter send, including the ones that were deliberately skipped. */
export interface NewsletterCampaign {
  id: string;
  blogId?: string;
  /** Snapshotted, so history still reads correctly if the post is retitled. */
  blogTitle?: string;
  blogSlug?: string;
  subject: string;
  source: CampaignSource;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  reason?: string;
  triggeredByName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface NewsletterSettings {
  isPaused: boolean;
  /** Start of the current no-repeat rotation. */
  cycleStartedAt?: string;
}

/** A rendered preview of the next email, without sending it. */
export interface NewsletterPreview {
  blogId: string;
  title: string;
  slug: string;
  subject: string;
  html: string;
  recipientCount: number;
}
