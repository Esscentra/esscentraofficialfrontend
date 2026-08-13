import { useMemo, useState } from 'react';
import {
  Archive,
  CircleDot,
  ExternalLink,
  GitFork,
  Github,
  Lock,
  Globe,
  RefreshCw,
  Star,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { FinanceTable } from '@/components/finance/FinanceTable';
import { Pill, SelectControl } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, TableSkeleton } from '@/components/finance/States';
import { useInvestorData } from './investor/useInvestorData';
import { getGithubOverview, type GithubOverview, type GithubRepo } from '@/lib/githubApi';
import { formatDate } from '@/lib/format';

/**
 * ============================================================================
 *  SUPER ADMIN — GITHUB REPOSITORIES
 * ============================================================================
 *
 * Every repository on the company GitHub account, private ones included. The
 * personal access token never leaves the backend; this page reads a cached,
 * trimmed mirror through our own API.
 * ============================================================================
 */

type Visibility = '' | 'public' | 'private';

export default function GithubRepos() {
  const [visibility, setVisibility] = useState<Visibility>('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, reload } = useInvestorData<GithubOverview>(
    () => getGithubOverview(),
    [],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await getGithubOverview(true); // repopulates the server cache
      reload();
    } finally {
      setRefreshing(false);
    }
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.repos.filter((repo) => {
      if (visibility === 'public' && repo.private) return false;
      if (visibility === 'private' && !repo.private) return false;
      if (!term) return true;
      return (
        repo.name.toLowerCase().includes(term) ||
        (repo.description ?? '').toLowerCase().includes(term) ||
        (repo.language ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, search, visibility]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engineering"
        title="GitHub repositories"
        subtitle="Every repository on the company account, private ones included."
        action={
          <Button size="sm" variant="secondary" loading={refreshing} onClick={() => void refresh()}>
            {!refreshing && <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        }
      />

      {loading ? (
        <>
          <CardGridSkeleton />
          <TableSkeleton />
        </>
      ) : error || !data ? (
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      ) : (
        <>
          {/* Account strip */}
          <a
            href={data.account.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="glass-card flex items-center gap-4 p-5 transition hover:border-brand-400/40"
          >
            <img
              src={data.account.avatarUrl}
              alt={data.account.login}
              className="h-12 w-12 rounded-full ring-1 ring-white/15"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-white">
                <Github className="h-4 w-4 shrink-0" />
                {data.account.name ?? data.account.login}
                <span className="text-sm font-normal text-slate-400">
                  @{data.account.login}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                {data.totals.count} repositories · {data.totals.privateCount} private ·{' '}
                {data.totals.publicCount} public
                {data.totals.archivedCount > 0 && ` · ${data.totals.archivedCount} archived`}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
          </a>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={Github} label="Repositories" value={data.totals.count} />
            <StatCard icon={Lock} label="Private" value={data.totals.privateCount} />
            <StatCard icon={Star} label="Total stars" value={data.totals.stars} />
            <StatCard icon={CircleDot} label="Open issues" value={data.totals.openIssues} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 space-y-1.5">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, description or language…"
                className="glass-input !pl-4"
              />
            </label>
            <SelectControl
              label="Visibility"
              value={visibility}
              onChange={(value) => setVisibility(value as Visibility)}
              options={[
                { value: '', label: 'All repositories' },
                { value: 'private', label: 'Private only' },
                { value: 'public', label: 'Public only' },
              ]}
            />
          </div>

          <FinanceTable<GithubRepo>
            rows={rows}
            rowKey={(repo) => String(repo.id)}
            emptyTitle="No repositories match"
            emptyMessage="Adjust the search or visibility filter."
            maxHeight={640}
            columns={[
              {
                key: 'name',
                header: 'Repository',
                render: (repo) => (
                  <div className="min-w-0">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 font-semibold text-brand-300 underline-offset-2 hover:underline"
                    >
                      <span className="truncate">{repo.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    </a>
                    {repo.description && (
                      <p className="mt-0.5 max-w-md truncate text-xs text-slate-500">
                        {repo.description}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: 'visibility',
                header: 'Visibility',
                align: 'center',
                render: (repo) => (
                  <span className="inline-flex items-center gap-1.5">
                    <Pill tone={repo.private ? 'amber' : 'green'}>
                      {repo.private ? (
                        <>
                          <Lock className="mr-1 inline h-3 w-3" />
                          Private
                        </>
                      ) : (
                        <>
                          <Globe className="mr-1 inline h-3 w-3" />
                          Public
                        </>
                      )}
                    </Pill>
                    {repo.archived && (
                      <Pill tone="blue">
                        <Archive className="mr-1 inline h-3 w-3" />
                        Archived
                      </Pill>
                    )}
                  </span>
                ),
              },
              {
                key: 'language',
                header: 'Language',
                hideOnMobile: true,
                render: (repo) => (
                  <span className="text-slate-300">{repo.language ?? '—'}</span>
                ),
              },
              {
                key: 'stars',
                header: 'Stars',
                numeric: true,
                hideOnMobile: true,
                render: (repo) => (
                  <span className="inline-flex items-center gap-1 text-slate-300">
                    <Star className="h-3.5 w-3.5 text-amber-300" />
                    {repo.stargazersCount}
                  </span>
                ),
              },
              {
                key: 'forks',
                header: 'Forks',
                numeric: true,
                hideOnMobile: true,
                render: (repo) => (
                  <span className="inline-flex items-center gap-1 text-slate-300">
                    <GitFork className="h-3.5 w-3.5 text-slate-500" />
                    {repo.forksCount}
                  </span>
                ),
              },
              {
                key: 'issues',
                header: 'Issues',
                numeric: true,
                hideOnMobile: true,
                render: (repo) => (
                  <span className="text-slate-300">{repo.openIssuesCount}</span>
                ),
              },
              {
                key: 'pushed',
                header: 'Last push',
                render: (repo) => (
                  <span className="whitespace-nowrap text-slate-400">
                    {repo.pushedAt ? formatDate(repo.pushedAt) : '—'}
                  </span>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Github;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
