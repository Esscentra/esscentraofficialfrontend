import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Copy,
  Eye,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  PanelsTopBottom,
  PenLine,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { Markdown } from '@/components/ui/Markdown';
import { useToast } from '@/components/ui/Toast';
import { API_BASE_URL } from '@/lib/api';
import {
  createPost,
  deletePost,
  getPost,
  listCategories,
  listSeries,
  updatePost,
  type PostInput,
} from '@/lib/blogApi';
import { cn, getErrorMessage } from '@/lib/utils';
import type { BlogCategory, BlogSeries, BlogStatus } from '@/types';

const STATUSES: BlogStatus[] = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];
const STATUS_TONE: Record<BlogStatus, Tone> = {
  DRAFT: 'gray',
  SCHEDULED: 'amber',
  PUBLISHED: 'green',
  ARCHIVED: 'red',
};

type Mode = 'write' | 'preview' | 'split';

const STARTER = `## Getting started

Write in **Markdown**. Fenced code blocks are highlighted:

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}\`;
}
\`\`\`

> Tip: \`##\` and \`###\` headings become the table of contents automatically.
`;

/** ISO → the `yyyy-MM-ddTHH:mm` a datetime-local input expects, in local time. */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Rough live counts. The server recomputes both on save — these are feedback. */
function stats(markdown: string) {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  return { words, minutes: Math.max(1, Math.ceil(words / 220)) };
}

interface FormState {
  title: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tags: string;
  seriesId: string;
  seriesOrder: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string;
  featuredImageAlt: string;
  status: BlogStatus;
  scheduledFor: string;
}

const EMPTY: FormState = {
  title: '',
  excerpt: '',
  content: STARTER,
  categoryId: '',
  tags: '',
  seriesId: '',
  seriesOrder: '',
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  ogImage: '',
  featuredImageAlt: '',
  status: 'DRAFT',
  scheduledFor: '',
};

/** Sidebar grouping. */
function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Hash;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-brand-300" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function BlogEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | undefined>();
  const [previewToken, setPreviewToken] = useState<string | undefined>();
  const [slug, setSlug] = useState<string | undefined>();

  const [mode, setMode] = useState<Mode>('write');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objectUrl = useRef<string | null>(null);

  const set = <K extends keyof FormState>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value as FormState[K] }));

  /* --------------------------------- loading -------------------------------- */

  useEffect(() => {
    // Taxonomy is needed whether creating or editing.
    Promise.all([listCategories(), listSeries()])
      .then(([c, s]) => {
        setCategories(c);
        setSeries(s);
        // Preselect the only sensible default so "category is required" never
        // ambushes someone on their first save.
        setForm((f) => (f.categoryId || !c.length ? f : { ...f, categoryId: c[0].id }));
      })
      .catch((e) => toast.error('Could not load categories', getErrorMessage(e)));
  }, [toast]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    getPost(id!)
      .then((p) => {
        setForm({
          title: p.title,
          excerpt: p.excerpt,
          content: p.content ?? '',
          categoryId: p.categoryId ?? '',
          tags: p.tags.join(', '),
          seriesId: p.seriesId ?? '',
          seriesOrder: p.seriesOrder ? String(p.seriesOrder) : '',
          seoTitle: p.seoTitle ?? '',
          seoDescription: p.seoDescription ?? '',
          canonicalUrl: p.canonicalUrl ?? '',
          ogImage: p.ogImage ?? '',
          featuredImageAlt: p.featuredImageAlt ?? '',
          status: p.status,
          scheduledFor: toLocalInput(p.scheduledFor),
        });
        setCoverPreview(p.featuredImage);
        setPreviewToken(p.previewToken);
        setSlug(p.slug);
      })
      .catch((e) => setError(getErrorMessage(e, 'This post could not be loaded.')))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Release the blob URL for a replaced/removed cover preview.
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const onPickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreview(objectUrl.current);
  };

  /* --------------------------------- saving --------------------------------- */

  const buildPayload = useCallback(
    (status: BlogStatus): PostInput => ({
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      categoryId: form.categoryId,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      seriesId: form.seriesId,
      seriesOrder: form.seriesOrder ? Number(form.seriesOrder) : undefined,
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      canonicalUrl: form.canonicalUrl.trim(),
      ogImage: form.ogImage.trim(),
      featuredImageAlt: form.featuredImageAlt.trim(),
      status,
      // datetime-local gives a local wall-clock string; send an absolute
      // instant so a server in another timezone publishes at the right moment.
      scheduledFor:
        status === 'SCHEDULED' && form.scheduledFor
          ? new Date(form.scheduledFor).toISOString()
          : '',
      featuredImage: coverFile,
    }),
    [form, coverFile],
  );

  const save = async (status: BlogStatus) => {
    if (!form.title.trim()) {
      toast.error('A title is required');
      return;
    }
    if (!form.categoryId) {
      toast.error('Pick a category', 'Every post belongs to one.');
      return;
    }
    if (status === 'SCHEDULED' && !form.scheduledFor) {
      toast.error('Pick a publish date', 'A scheduled post needs one.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(status);
      const saved = isNew
        ? await createPost(payload)
        : await updatePost(id!, payload);

      setForm((f) => ({ ...f, status: saved.status }));
      setPreviewToken(saved.previewToken);
      setSlug(saved.slug);
      setCoverFile(null);

      toast.success(
        status === 'PUBLISHED'
          ? 'Published'
          : status === 'SCHEDULED'
            ? 'Scheduled'
            : 'Saved',
        saved.title,
      );

      // Move off /new so a second save updates rather than duplicating.
      if (isNew) navigate(`/app/blog/${saved.id}`, { replace: true });
    } catch (e) {
      toast.error('Could not save', getErrorMessage(e, 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    try {
      await deletePost(id!);
      toast.info('Post deleted', form.title);
      navigate('/app/blog', { replace: true });
    } catch (e) {
      toast.error('Delete failed', getErrorMessage(e, 'Please try again.'));
    }
  };

  const copyPreviewLink = async () => {
    if (!previewToken) return;
    try {
      await navigator.clipboard.writeText(
        `${API_BASE_URL}/blog/preview/${previewToken}`,
      );
      toast.success('Preview link copied', 'Anyone with the link can read the draft.');
    } catch {
      toast.error('Could not copy', 'Copy it from the field instead.');
    }
  };

  const counts = useMemo(() => stats(form.content), [form.content]);

  /* --------------------------------- render --------------------------------- */

  if (loading) return <LoadingCard label="Loading post…" />;

  if (error) {
    return (
      <EmptyState
        icon={FileText}
        title="Post unavailable"
        description={error}
        action={
          <Link to="/app/blog">
            <Button size="sm" variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Back to posts
            </Button>
          </Link>
        }
      />
    );
  }

  const MODES: Array<{ key: Mode; label: string; icon: typeof PenLine }> = [
    { key: 'write', label: 'Write', icon: PenLine },
    { key: 'preview', label: 'Preview', icon: Eye },
    { key: 'split', label: 'Split', icon: PanelsTopBottom },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/app/blog"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Posts
      </Link>

      <PageHeader
        eyebrow={slug ? `/${slug}` : 'New'}
        title={isNew ? 'New post' : 'Edit post'}
        subtitle={`${counts.words.toLocaleString()} words · ${counts.minutes} min read`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={STATUS_TONE[form.status]}>
              {humanize(form.status)}
            </StatusBadge>
            {!isNew && (
              <Button size="sm" variant="ghost" onClick={remove}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => save(form.status)}
              disabled={saving}
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </Button>
            {form.status !== 'PUBLISHED' && (
              <Button
                size="sm"
                onClick={() => save(form.status === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHED')}
                disabled={saving}
              >
                <Send className="h-4 w-4" />
                {form.status === 'SCHEDULED' ? 'Schedule' : 'Publish'}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ------------------------------ main column ----------------------------- */}
        <div className="space-y-4 lg:col-span-2">
          <div className="glass-card space-y-4 p-5">
            <Input
              label="Title"
              value={form.title}
              onChange={set('title')}
              placeholder="Scaling Mongo queries without losing your mind"
              required
            />
            <Textarea
              label="Excerpt"
              rows={2}
              value={form.excerpt}
              onChange={set('excerpt')}
              placeholder="Leave blank to generate one from the first lines of the post."
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
              <div className="flex gap-1">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                      mode === m.key
                        ? 'bg-white/[0.1] text-white'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
                      // Split needs the width; hide the option on small screens.
                      m.key === 'split' && 'hidden lg:inline-flex',
                    )}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {counts.minutes} min
              </span>
            </div>

            <div
              className={cn(
                'grid',
                mode === 'split' ? 'lg:grid-cols-2 lg:divide-x lg:divide-white/10' : 'grid-cols-1',
              )}
            >
              {mode !== 'preview' && (
                <textarea
                  value={form.content}
                  onChange={set('content')}
                  spellCheck={false}
                  placeholder="Write in Markdown…"
                  className="min-h-[28rem] w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
                />
              )}
              {mode !== 'write' && (
                <div className="min-h-[28rem] overflow-x-auto p-5">
                  {form.content.trim() ? (
                    <Markdown content={form.content} />
                  ) : (
                    <p className="text-sm text-slate-500">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* -------------------------------- sidebar ------------------------------- */}
        <div className="space-y-4">
          <Panel icon={Send} title="Publishing">
            <Select
              label="Status"
              value={form.status}
              onChange={set('status')}
              options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
            />
            {form.status === 'SCHEDULED' && (
              <Input
                label="Publish at"
                type="datetime-local"
                value={form.scheduledFor}
                onChange={set('scheduledFor')}
                className="!pl-4"
                hint="Goes live within five minutes of this time."
              />
            )}
            {previewToken && (
              <div className="space-y-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  fullWidth
                  onClick={copyPreviewLink}
                >
                  <Copy className="h-4 w-4" /> Copy preview link
                </Button>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Reads the draft in any status, no login needed — for sending to a
                  reviewer.
                </p>
              </div>
            )}
          </Panel>

          <Panel icon={Hash} title="Organisation">
            <Select
              label="Category"
              value={form.categoryId}
              onChange={set('categoryId')}
              options={
                categories.length
                  ? categories.map((c) => ({ value: c.id, label: c.name }))
                  : [{ value: '', label: 'No categories yet' }]
              }
            />
            <Input
              label="Tags (comma separated)"
              value={form.tags}
              onChange={set('tags')}
              placeholder="typescript, mongodb, performance"
            />
            {form.tags.trim() && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-white/10"
                    >
                      {t.toLowerCase()}
                    </span>
                  ))}
              </div>
            )}
            <Select
              label="Series"
              value={form.seriesId}
              onChange={set('seriesId')}
              options={[
                { value: '', label: 'Not part of a series' },
                ...series.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            {form.seriesId && (
              <Input
                label="Part number"
                type="number"
                min={1}
                value={form.seriesOrder}
                onChange={set('seriesOrder')}
                hint="Reading order within the series."
              />
            )}
          </Panel>

          <Panel icon={ImageIcon} title="Cover image">
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                <img src={coverPreview} alt="" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
                    objectUrl.current = null;
                    setCoverFile(null);
                    setCoverPreview(undefined);
                  }}
                  aria-label="Remove cover"
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/60 text-slate-300 backdrop-blur transition hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              onChange={onPickCover}
              className="w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:border-brand-400/50"
            />
            <Input
              label="Alt text"
              value={form.featuredImageAlt}
              onChange={set('featuredImageAlt')}
              placeholder="Describe the image for screen readers"
            />
          </Panel>

          <Panel icon={Search} title="SEO">
            <Input
              label="SEO title"
              value={form.seoTitle}
              onChange={set('seoTitle')}
              hint="Defaults to the post title."
            />
            <Textarea
              label="Meta description"
              rows={2}
              value={form.seoDescription}
              onChange={set('seoDescription')}
            />
            <Input
              label="Canonical URL"
              value={form.canonicalUrl}
              onChange={set('canonicalUrl')}
              icon={<Link2 />}
              placeholder="https://dev.to/you/original-post"
              hint="Set this when the post first appeared elsewhere."
            />
            <Input
              label="Social image URL"
              value={form.ogImage}
              onChange={set('ogImage')}
              hint="Falls back to the cover image."
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
