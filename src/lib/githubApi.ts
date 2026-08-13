import api from './api';
import type { ApiResponse } from '@/types';

/* ------------------------------- GitHub ---------------------------------- */
/**
 * Read-only mirror of the company GitHub account, super admin only.
 * The personal access token lives in the backend .env; the browser only ever
 * talks to our own API.
 *
 *   GET /github/repos            → account + every repo (private included)
 *   GET /github/repos?refresh=true → bypass the server's one-minute cache
 */

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  defaultBranch: string;
  sizeKb: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

export interface GithubOverview {
  account: {
    login: string;
    name: string | null;
    avatarUrl: string;
    htmlUrl: string;
    type: string;
  };
  totals: {
    count: number;
    privateCount: number;
    publicCount: number;
    archivedCount: number;
    stars: number;
    openIssues: number;
  };
  repos: GithubRepo[];
  fetchedAt: string;
}

export async function getGithubOverview(refresh = false): Promise<GithubOverview> {
  const { data } = await api.get<ApiResponse<GithubOverview>>(
    `/github/repos${refresh ? '?refresh=true' : ''}`,
  );
  return data.data;
}
