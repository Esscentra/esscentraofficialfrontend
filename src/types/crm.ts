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

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdAt?: string;
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
