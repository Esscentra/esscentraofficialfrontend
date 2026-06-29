import { useState, type FormEvent } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui/Field';
import { FileField } from '@/components/ui/FileField';
import { Button } from '@/components/ui/Button';
import { StatusBadge, humanize, type Tone } from '@/components/ui/StatusBadge';
import { RowButton } from '@/components/ui/RowButton';
import { useToast } from '@/components/ui/Toast';
import type { BlogPost, BlogStatus } from '@/types';

const STATUSES: BlogStatus[] = ['DRAFT', 'PUBLISHED'];
const TONE: Record<BlogStatus, Tone> = { DRAFT: 'gray', PUBLISHED: 'green' };

export default function BlogPage() {
  const toast = useToast();
  const [items, setItems] = useState<BlogPost[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);

  // TODO (load): GET /blog

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    // The image arrives as a File. When you wire the API, send the whole
    // FormData as multipart/form-data (don't JSON-stringify it):
    //   await api.post('/blog', f, { headers: { 'Content-Type': undefined } })
    const imageFile = f.get('featuredImage') as File | null;
    const previewUrl =
      imageFile && imageFile.size > 0 ? URL.createObjectURL(imageFile) : editing?.featuredImage;

    const data = {
      title: String(f.get('title') ?? ''),
      excerpt: String(f.get('excerpt') ?? ''),
      content: String(f.get('content') ?? ''),
      featuredImage: previewUrl,
      tags: String(f.get('tags') ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status: String(f.get('status') ?? 'DRAFT') as BlogStatus,
    };

    if (editing) {
      // TODO (update): your backend exposes POST /blog and DELETE /blog/:id.
      //   If you add an update route (e.g. PATCH /blog/:id), send `f` as multipart.
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      toast.success('Post updated');
    } else {
      // TODO (create): POST /blog (multipart) — body also needs categoryId + featuredImage file
      setItems((prev) => [{ id: crypto.randomUUID(), views: 0, ...data }, ...prev]);
      toast.success('Post created');
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    // TODO (delete): DELETE /blog/:id
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.info('Post deleted');
  };

  const columns: Column<BlogPost>[] = [
    { key: 'title', header: 'Title', render: (b) => <span className="font-medium text-white">{b.title}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge tone={TONE[b.status]}>{humanize(b.status)}</StatusBadge>,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (b) => (b.tags.length ? b.tags.join(', ') : '—'),
    },
    { key: 'views', header: 'Views', render: (b) => b.views ?? 0 },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          <RowButton onClick={() => { setEditing(b); setOpen(true); }} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </RowButton>
          <RowButton onClick={() => remove(b.id)} aria-label="Delete" danger>
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
        subtitle="Write and publish posts."
        action={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New post
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Wire up GET /blog to load posts. Create one to preview the editor."
          action={
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New post
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit post' : 'New post'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Title" name="title" defaultValue={editing?.title} required />
          <Textarea label="Excerpt" name="excerpt" rows={2} defaultValue={editing?.excerpt} required />
          <Textarea label="Content" name="content" rows={6} defaultValue={editing?.content} required />
          <FileField label="Featured image" name="featuredImage" />
          <Select
            label="Status"
            name="status"
            defaultValue={editing?.status ?? 'DRAFT'}
            options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          />
          <Input
            label="Tags (comma separated)"
            name="tags"
            defaultValue={editing?.tags.join(', ')}
            placeholder="product, release, news"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Create post'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
