import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  FileText,
  FolderTree,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useToast } from '@/components/ui/Toast';
import {
  createCategory,
  createSeries,
  deleteCategory,
  deletePost,
  deleteSeries,
  listAdminPosts,
  listCategories,
  listSeries,
} from '@/lib/blogApi';
import { cn, getErrorMessage } from '@/lib/utils';
import type { BlogCategory, BlogPost, BlogSeries, BlogStatus } from '@/types';

const STATUS_TONE: Record<BlogStatus, Tone> = {
  DRAFT: 'gray',
  SCHEDULED: 'amber',
  PUBLISHED: 'green',
  ARCHIVED: 'red',
};

/** Status tabs. '' is "all". */
const TABS: Array<{ key: BlogStatus | ''; label: string }> = [
  { key: '', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'ARCHIVED', label: 'Archived' },
];

const PAGE_SIZE = 15;

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

/**
 * Manage categories or series. Both are name + description with a post count,
 * and both refuse deletion while posts still reference them — so one component
 * covers each, keyed by the labels passed in.
 */
function TaxonomyModal<T extends BlogCategory | BlogSeries>({
  open,
  onClose,
  title,
  noun,
  items,
  onCreate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  noun: string;
  items: T[];
  onCreate: (input: { name: string; description?: string }) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get('name') ?? '').trim();
    if (!name) return;

    setSaving(true);
    try {
      await onCreate({ name, description: String(f.get('description') ?? '') });
      form.reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        {items.length > 0 && (
          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    /{item.slug}
                    {typeof item.postCount === 'number' &&
                      ` · ${item.postCount} post${item.postCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                <RowButton
                  onClick={() => onDelete(item)}
                  aria-label="Delete"
                  title={
                    item.postCount
                      ? `In use by ${item.postCount} post${item.postCount === 1 ? '' : 's'}`
                      : 'Delete'
                  }
                  disabled={!!item.postCount}
                  danger
                >
                  <Trash2 className="h-4 w-4" />
                </RowButton>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-3 border-t border-white/10 pt-4">
          <Input label={`New ${noun}`} name="name" placeholder="Engineering" required />
          <Textarea label="Description" name="description" rows={2} />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              <Plus className="h-4 w-4" /> {saving ? 'Adding…' : `Add ${noun}`}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default function BlogPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BlogStatus | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listAdminPosts({ status, q: query, page, limit: PAGE_SIZE })
      .then((res) => {
        setPosts(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((e) => toast.error('Could not load posts', getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [status, query, page, toast]);

  useEffect(load, [load]);

  const loadTaxonomy = useCallback(() => {
    Promise.all([listCategories(), listSeries()])
      .then(([c, s]) => {
        setCategories(c);
        setSeries(s);
      })
      .catch(() => {
        /* Non-fatal — the list still works without the taxonomy panels. */
      });
  }, []);

  useEffect(loadTaxonomy, [loadTaxonomy]);

  // Debounce the search box so each keystroke isn't a request.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const remove = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

    const prev = posts;
    setPosts((p) => p.filter((it) => it.id !== post.id)); // optimistic
    try {
      await deletePost(post.id);
      toast.info('Post deleted', post.title);
    } catch (e) {
      setPosts(prev);
      toast.error('Delete failed', getErrorMessage(e, 'Please try again.'));
    }
  };

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (b) => (
        <div className="flex items-center gap-3">
          {b.featuredImage ? (
            <img
              src={b.featuredImage}
              alt=""
              className="h-9 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
            />
          ) : (
            <span className="grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-slate-600 ring-1 ring-white/10">
              <FileText className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{b.title}</p>
            <p className="truncate text-xs text-slate-500">
              {b.author?.name ?? 'Unknown author'}
              {b.category && ` · ${b.category.name}`}
              {b.series && ` · ${b.series.name}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <div className="space-y-1">
          <StatusBadge tone={STATUS_TONE[b.status]}>{humanize(b.status)}</StatusBadge>
          <p className="text-[11px] text-slate-500">
            {b.status === 'SCHEDULED' ? day(b.scheduledFor) : day(b.publishedAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (b) =>
        b.tags.length ? (
          <div className="flex max-w-[14rem] flex-wrap gap-1">
            {b.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-white/10"
              >
                {t}
              </span>
            ))}
            {b.tags.length > 3 && (
              <span className="text-[11px] text-slate-500">+{b.tags.length - 3}</span>
            )}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'reach',
      header: 'Reach',
      render: (b) => (
        <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-slate-300">
          <Eye className="h-3.5 w-3.5 text-slate-500" />
          {b.views.toLocaleString()}
          <span className="text-xs text-slate-600">· {b.readingMinutes}m</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (b) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <RowButton
            onClick={() => navigate(`/app/blog/${b.id}`)}
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(b)} aria-label="Delete" title="Delete" danger>
            <Trash2 className="h-4 w-4" />
          </RowButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Blog"
        subtitle="Write, schedule and publish engineering posts."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCategoriesOpen(true)}>
              <FolderTree className="h-4 w-4" /> Categories
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setSeriesOpen(true)}>
              <Layers className="h-4 w-4" /> Series
            </Button>
            <Button size="sm" onClick={() => navigate('/app/blog/new')}>
              <Plus className="h-4 w-4" /> New post
            </Button>
          </div>
        }
      />

      {/* ------------------------------- filters ------------------------------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                status === tab.key
                  ? 'bg-white/[0.1] text-white'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            label=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, excerpt or tag"
            icon={<Search />}
          />
        </div>
      </div>

      {loading ? (
        <LoadingCard label="Loading posts…" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={query || status ? 'Nothing matches' : 'No posts yet'}
          description={
            query || status
              ? 'Try a different search or status filter.'
              : categories.length === 0
                ? 'Add a category first — every post belongs to one — then write your first post.'
                : 'Write your first post. Markdown in, syntax-highlighted code out.'
          }
          action={
            categories.length === 0 ? (
              <Button size="sm" onClick={() => setCategoriesOpen(true)}>
                <FolderTree className="h-4 w-4" /> Add a category
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate('/app/blog/new')}>
                <Plus className="h-4 w-4" /> New post
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={posts}
            onRowClick={(b) => navigate(`/app/blog/${b.id}`)}
          />

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Page {page} of {pages} · {total.toLocaleString()} posts
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <TaxonomyModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        title="Categories"
        noun="category"
        items={categories}
        onCreate={async (input) => {
          try {
            await createCategory(input);
            loadTaxonomy();
            toast.success('Category added', input.name);
          } catch (e) {
            toast.error('Could not add', getErrorMessage(e, 'Please try again.'));
          }
        }}
        onDelete={async (item) => {
          if (!window.confirm(`Delete the "${item.name}" category?`)) return;
          try {
            await deleteCategory(item.id);
            loadTaxonomy();
            toast.info('Category deleted', item.name);
          } catch (e) {
            toast.error('Could not delete', getErrorMessage(e, 'Please try again.'));
          }
        }}
      />

      <TaxonomyModal
        open={seriesOpen}
        onClose={() => setSeriesOpen(false)}
        title="Series"
        noun="series"
        items={series}
        onCreate={async (input) => {
          try {
            await createSeries(input);
            loadTaxonomy();
            toast.success('Series added', input.name);
          } catch (e) {
            toast.error('Could not add', getErrorMessage(e, 'Please try again.'));
          }
        }}
        onDelete={async (item) => {
          if (!window.confirm(`Delete the "${item.name}" series?`)) return;
          try {
            await deleteSeries(item.id);
            loadTaxonomy();
            toast.info('Series deleted', item.name);
          } catch (e) {
            toast.error('Could not delete', getErrorMessage(e, 'Please try again.'));
          }
        }}
      />
    </div>
  );
}
