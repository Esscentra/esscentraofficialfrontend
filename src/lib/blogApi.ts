import api from './api';
import type {
  ApiResponse,
  BlogAuthor,
  BlogCategory,
  BlogPost,
  BlogSeries,
  BlogStatus,
  BlogTag,
  Paginated,
  SeriesPost,
  TocEntry,
} from '@/types';

/**
 * Blog — wired to the live Esscentra backend.
 *
 * Permissions (enforced server-side):
 *   GET  /blog, /blog/slug/:slug, /blog/categories,
 *        /blog/series, /blog/tags, /blog/preview/:token   → public
 *   GET  /blog/admin/list, /blog/admin/:id                → ADMIN / SUPER_ADMIN
 *   POST | PATCH | DELETE  everything else                → ADMIN / SUPER_ADMIN
 *
 * Reads are public because the marketing site renders them; only PUBLISHED
 * posts whose publish date has passed come back from the public endpoints.
 */

/* --------------------------------- mapping -------------------------------- */

interface RawRef {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  isActive?: boolean;
  postCount?: number;
}

interface RawAuthor {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  bio?: string;
  jobTitle?: string;
  socials?: BlogAuthor['socials'];
}

interface RawPost {
  _id?: string;
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  ogImage?: string;
  categoryId?: RawRef | string;
  authorId?: RawAuthor | string;
  tags?: string[];
  seriesId?: RawRef | string;
  seriesOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  status: BlogStatus;
  publishedAt?: string;
  scheduledFor?: string;
  readingMinutes?: number;
  wordCount?: number;
  toc?: TocEntry[];
  previewToken?: string;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
  seriesPosts?: Array<Record<string, any>>;
  related?: RawPost[];
}

const idOf = (ref?: RawRef | RawAuthor | string): string | undefined => {
  if (!ref) return undefined;
  return typeof ref === 'string' ? ref : (ref as RawRef)._id ?? (ref as RawRef).id;
};

function mapTaxonomy(ref?: RawRef | string): BlogCategory | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  return {
    id: String(ref._id ?? ref.id ?? ''),
    name: ref.name ?? '',
    slug: ref.slug ?? '',
    description: ref.description,
    isActive: ref.isActive,
    postCount: ref.postCount,
  };
}

function mapSeries(ref?: RawRef | string): BlogSeries | undefined {
  const base = mapTaxonomy(ref);
  if (!base) return undefined;
  return { ...base, coverImage: (ref as RawRef).coverImage };
}

function mapAuthor(ref?: RawAuthor | string): BlogAuthor | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  const name = [ref.firstName, ref.lastName].filter(Boolean).join(' ').trim();
  return {
    id: String(ref._id ?? ''),
    name: name || 'Unknown author',
    avatarUrl: ref.profileImage,
    bio: ref.bio,
    jobTitle: ref.jobTitle,
    socials: ref.socials,
  };
}

function mapPost(p: RawPost): BlogPost {
  return {
    id: String(p._id ?? p.id ?? ''),
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    featuredImage: p.featuredImage,
    featuredImageAlt: p.featuredImageAlt,
    ogImage: p.ogImage,
    category: mapTaxonomy(p.categoryId),
    categoryId: idOf(p.categoryId),
    author: mapAuthor(p.authorId),
    authorId: idOf(p.authorId),
    tags: p.tags ?? [],
    series: mapSeries(p.seriesId),
    seriesId: idOf(p.seriesId),
    seriesOrder: p.seriesOrder,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    canonicalUrl: p.canonicalUrl,
    status: p.status,
    publishedAt: p.publishedAt,
    scheduledFor: p.scheduledFor,
    readingMinutes: p.readingMinutes ?? 1,
    wordCount: p.wordCount ?? 0,
    toc: p.toc ?? [],
    previewToken: p.previewToken,
    views: p.views ?? 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    seriesPosts: (p.seriesPosts ?? []).map(
      (s): SeriesPost => ({
        id: String(s._id ?? s.id ?? ''),
        title: s.title,
        slug: s.slug,
        seriesOrder: s.seriesOrder,
        readingMinutes: s.readingMinutes,
        publishedAt: s.publishedAt,
      }),
    ),
    related: (p.related ?? []).map(mapPost),
  };
}

/** The backend puts pagination in `meta`, beside the usual `data` envelope. */
interface ListEnvelope<T> extends ApiResponse<T[]> {
  meta?: { total: number; page: number; limit: number; pages: number };
}

function mapList(data: ListEnvelope<RawPost>): Paginated<BlogPost> {
  const items = (data.data ?? []).map(mapPost);
  return {
    items,
    total: data.meta?.total ?? items.length,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? items.length,
    pages: data.meta?.pages ?? 1,
  };
}

/* ---------------------------------- posts --------------------------------- */

export interface BlogListQuery {
  status?: BlogStatus | '';
  categoryId?: string;
  seriesId?: string;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
}

/** Drop empty filters so they don't reach the API as `?status=`. */
function params(query: BlogListQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  );
}

/** Admin listing — every status. */
export async function listAdminPosts(
  query: BlogListQuery = {},
): Promise<Paginated<BlogPost>> {
  const { data } = await api.get<ListEnvelope<RawPost>>('/blog/admin/list', {
    params: params(query),
  });
  return mapList(data);
}

/** Public listing — published posts only. */
export async function listPublicPosts(
  query: BlogListQuery = {},
): Promise<Paginated<BlogPost>> {
  const { data } = await api.get<ListEnvelope<RawPost>>('/blog', {
    params: params(query),
  });
  return mapList(data);
}

/** A single post in any status, for the editor. */
export async function getPost(id: string): Promise<BlogPost> {
  const { data } = await api.get<ApiResponse<RawPost>>(`/blog/admin/${id}`);
  return mapPost(data.data);
}

export async function getPostBySlug(slug: string): Promise<BlogPost> {
  const { data } = await api.get<ApiResponse<RawPost>>(`/blog/slug/${slug}`);
  return mapPost(data.data);
}

export async function getPostByPreviewToken(token: string): Promise<BlogPost> {
  const { data } = await api.get<ApiResponse<RawPost>>(`/blog/preview/${token}`);
  return mapPost(data.data);
}

export interface PostInput {
  title: string;
  excerpt?: string;
  content: string;
  categoryId: string;
  tags?: string[];
  featuredImageAlt?: string;
  ogImage?: string;
  seriesId?: string;
  seriesOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  status?: BlogStatus;
  scheduledFor?: string;
  /** New cover image. Omit to keep the current one. */
  featuredImage?: File | null;
}

/**
 * Posts always go up as multipart, whether or not there's a new cover — one
 * code path is easier to reason about than two, and the backend reads both
 * the file and the text fields from the same request.
 */
function toFormData(input: Partial<PostInput>): FormData {
  const form = new FormData();

  const append = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  };

  append('title', input.title);
  append('excerpt', input.excerpt);
  append('content', input.content);
  append('categoryId', input.categoryId);
  append('featuredImageAlt', input.featuredImageAlt);
  append('ogImage', input.ogImage);
  append('seoTitle', input.seoTitle);
  append('seoDescription', input.seoDescription);
  append('canonicalUrl', input.canonicalUrl);
  append('status', input.status);
  append('seriesOrder', input.seriesOrder);

  // Sent even when empty: "" is how the editor clears the series or the
  // schedule, and the backend treats it as an explicit reset.
  if (input.seriesId !== undefined) form.append('seriesId', input.seriesId ?? '');
  if (input.scheduledFor !== undefined) {
    form.append('scheduledFor', input.scheduledFor ?? '');
  }

  // FormData has no array type; the backend splits this on commas.
  if (input.tags !== undefined) form.append('tags', input.tags.join(','));

  if (input.featuredImage) form.append('featuredImage', input.featuredImage);

  return form;
}

/** Let the browser set the multipart boundary itself. */
const MULTIPART = { headers: { 'Content-Type': undefined } as never };

export async function createPost(input: PostInput): Promise<BlogPost> {
  const { data } = await api.post<ApiResponse<RawPost>>(
    '/blog',
    toFormData(input),
    MULTIPART,
  );
  return mapPost(data.data);
}

export async function updatePost(
  id: string,
  input: Partial<PostInput>,
): Promise<BlogPost> {
  const { data } = await api.patch<ApiResponse<RawPost>>(
    `/blog/${id}`,
    toFormData(input),
    MULTIPART,
  );
  return mapPost(data.data);
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`/blog/${id}`);
}

/* -------------------------------- taxonomy -------------------------------- */

export async function listCategories(): Promise<BlogCategory[]> {
  const { data } = await api.get<ApiResponse<RawRef[]>>('/blog/categories');
  return (data.data ?? []).map((c) => mapTaxonomy(c)!);
}

export async function createCategory(input: {
  name: string;
  description?: string;
}): Promise<BlogCategory> {
  const { data } = await api.post<ApiResponse<RawRef>>('/blog/categories', input);
  return mapTaxonomy(data.data)!;
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string; isActive?: boolean },
): Promise<BlogCategory> {
  const { data } = await api.patch<ApiResponse<RawRef>>(
    `/blog/categories/${id}`,
    input,
  );
  return mapTaxonomy(data.data)!;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/blog/categories/${id}`);
}

export async function listSeries(): Promise<BlogSeries[]> {
  const { data } = await api.get<ApiResponse<RawRef[]>>('/blog/series');
  return (data.data ?? []).map((s) => mapSeries(s)!);
}

export async function createSeries(input: {
  name: string;
  description?: string;
}): Promise<BlogSeries> {
  const { data } = await api.post<ApiResponse<RawRef>>('/blog/series', input);
  return mapSeries(data.data)!;
}

export async function updateSeries(
  id: string,
  input: { name?: string; description?: string; isActive?: boolean },
): Promise<BlogSeries> {
  const { data } = await api.patch<ApiResponse<RawRef>>(`/blog/series/${id}`, input);
  return mapSeries(data.data)!;
}

export async function deleteSeries(id: string): Promise<void> {
  await api.delete(`/blog/series/${id}`);
}

export async function listTags(): Promise<BlogTag[]> {
  const { data } = await api.get<ApiResponse<BlogTag[]>>('/blog/tags');
  return data.data ?? [];
}
