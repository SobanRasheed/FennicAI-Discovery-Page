/**
 * Content service layer: shared between the admin API and the public SSR
 * pages. All SQL lives here so both surfaces read D1 identically.
 */
import type { App } from 'astro';
import { HttpError, env } from './backend';
import { renderTiptapDoc, readingMinutes } from './richtext';

// ---------------------------------------------------------------------------
// Types (subset of columns each surface needs)
// ---------------------------------------------------------------------------

export interface SubjectRow {
  id: number;
  title: string;
  slug: string;
  description: string;
  introduction: string;
  image_media_id: number | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_active: number;
}

export interface TopicRow {
  id: number;
  subject_id: number;
  parent_topic_id: number | null;
  title: string;
  slug: string;
  description: string;
  sort_order: number;
}

export interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  content_json: string | null;
  article_type: 'article' | 'study-note';
  category: string | null;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'unpublished' | 'deleted';
  subject_id: number | null;
  topic_id: number | null;
  author_id: number | null;
  featured_media_id: number | null;
  scheduled_at: string | null;
  published_at: string | null;
  deleted_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_media_id: number | null;
  robots: string;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface McqRow {
  id: number;
  question: string;
  explanation: string;
  status: 'draft' | 'published' | 'unpublished' | 'deleted';
  subject_id: number | null;
  topic_id: number | null;
  article_id: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
  tags_json: string;
  created_at: string;
  updated_at: string;
}

export interface MediaRow {
  id: number;
  r2_key: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string;
  title: string | null;
  caption: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

const ARTICLE_SELECT = `
  SELECT id, title, slug, excerpt, content_html, content_json, article_type,
         category, status, subject_id, topic_id, author_id, featured_media_id,
         scheduled_at, published_at, deleted_at, seo_title, meta_description,
         canonical_url, og_title, og_description, og_image_media_id, robots,
         reading_minutes, created_at, updated_at
  FROM articles`;

export async function getArticleById(locals: App.Locals, id: number): Promise<ArticleRow | null> {
  const row = await env(locals).DB.prepare(`${ARTICLE_SELECT} WHERE id = ?`).bind(id).first<ArticleRow>();
  return row ?? null;
}

const ARTICLE_COLS = `id, title, slug, excerpt, content_html, content_json, article_type,
  category, status, subject_id, topic_id, author_id, featured_media_id,
  scheduled_at, published_at, deleted_at, seo_title, meta_description,
  canonical_url, og_title, og_description, og_image_media_id, robots,
  reading_minutes, created_at, updated_at`;

/** ARTICLE_COLS with every column qualified, for queries that join other
 *  tables (a bare `id` would be ambiguous against subjects/users). */
const ARTICLE_COLS_A = ARTICLE_COLS.split(',')
  .map((c) => `a.${c.trim()}`)
  .join(', ');

export async function getPublishedArticle(
  locals: App.Locals,
  subjectSlug: string,
  slug: string,
): Promise<(ArticleRow & { subject_title: string; subject_slug: string; author_name: string | null }) | null> {
  const row = await env(locals)
    .DB.prepare(
      `SELECT a.id, a.title, a.slug, a.excerpt, a.content_html, a.content_json,
              a.article_type, a.status, a.subject_id, a.topic_id, a.author_id,
              a.featured_media_id, a.scheduled_at, a.published_at, a.deleted_at,
              a.seo_title, a.meta_description, a.canonical_url, a.og_title,
              a.og_description, a.og_image_media_id, a.robots, a.reading_minutes,
              a.created_at, a.updated_at,
              s.title AS subject_title, s.slug AS subject_slug, u.display_name AS author_name
       FROM articles a
       JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE s.slug = ? AND a.slug = ? AND a.status = 'published'`,
    )
    .bind(subjectSlug, slug)
    .first<ArticleRow & { subject_title: string; subject_slug: string; author_name: string | null }>();
  return row ?? null;
}

/** List articles with admin filters. Returns rows + total for pagination. */
export async function listArticles(
  locals: App.Locals,
  opts: {
    status?: string;
    subjectId?: number;
    authorId?: number;
    articleType?: string;
    q?: string;
    sort?: 'updated' | 'published' | 'title';
    page?: number;
    perPage?: number;
    includeDeleted?: boolean;
  } = {},
): Promise<{ rows: ArticleRow[]; total: number }> {
  const db = env(locals).DB;
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    where.push('a.status = ?');
    params.push(opts.status);
  } else if (!opts.includeDeleted) {
    where.push("a.status != 'deleted'");
  }
  if (opts.subjectId) {
    where.push('a.subject_id = ?');
    params.push(opts.subjectId);
  }
  if (opts.authorId) {
    where.push('a.author_id = ?');
    params.push(opts.authorId);
  }
  if (opts.articleType) {
    where.push('a.article_type = ?');
    params.push(opts.articleType);
  }
  if (opts.q) {
    where.push('(a.title LIKE ? OR a.excerpt LIKE ?)');
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy =
    opts.sort === 'published'
      ? 'ORDER BY COALESCE(a.published_at, a.created_at) DESC'
      : opts.sort === 'title'
        ? 'ORDER BY a.title COLLATE NOCASE ASC'
        : 'ORDER BY a.updated_at DESC';
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(5, opts.perPage ?? 20));
  const offset = (page - 1) * perPage;

  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM articles a ${whereSql}`)
    .bind(...params)
    .first<{ total: number }>();
  const rows = await db
    .prepare(
      `${ARTICLE_SELECT.replace(/FROM articles/, 'FROM articles a')} ${whereSql} ${orderBy} LIMIT ? OFFSET ?`,
    )
    .bind(...params, perPage, offset)
    .all<ArticleRow>();
  return { rows: rows.results, total: totalRow?.total ?? 0 };
}

/** All tags/related/references for one article (admin editor + public). */
export async function getArticleExtras(locals: App.Locals, articleId: number) {
  const db = env(locals).DB;
  const [tags, related, references] = await Promise.all([
    db
      .prepare(
        `SELECT t.name FROM article_tags at JOIN tags t ON t.id = at.tag_id WHERE at.article_id = ?`,
      )
      .bind(articleId)
      .all<{ name: string }>(),
    db
      .prepare(
        `SELECT a.id, a.title, a.slug, s.slug AS subject_slug, a.article_type
         FROM article_related ar
         JOIN articles a ON a.id = ar.related_article_id
         JOIN subjects s ON s.id = a.subject_id
         WHERE ar.article_id = ? AND a.status = 'published'`,
      )
      .bind(articleId)
      .all<{ id: number; title: string; slug: string; subject_slug: string; article_type: string }>(),
    db
      .prepare(
        `SELECT r.* FROM article_references ar
         JOIN "references" r ON r.id = ar.reference_id
         WHERE ar.article_id = ? ORDER BY ar.sort_order, r.id`,
      )
      .bind(articleId)
      .all<Record<string, unknown>>(),
  ]);
  return {
    tags: tags.results.map((t) => t.name),
    related: related.results,
    references: references.results as {
      id: number;
      ref_type: string;
      title: string;
      authors: string;
      source: string;
      year: string | null;
      edition: string;
      url: string | null;
      doi: string;
      notes: string;
    }[],
  };
}

/** Related MCQs attached to an article (public: published only). */
export async function getMcqsForArticle(locals: App.Locals, articleId: number, publicOnly = true) {
  const statusSql = publicOnly ? "AND m.status = 'published'" : '';
  const rows = await env(locals)
    .DB.prepare(
      `SELECT m.id, m.question, m.explanation, m.difficulty FROM mcqs m
       WHERE m.article_id = ? ${statusSql} ORDER BY m.id`,
    )
    .bind(articleId)
    .all<{ id: number; question: string; explanation: string; difficulty: string }>();
  const out: { id: number; question: string; explanation: string; difficulty: string; options: { label: string; text: string; is_correct: number }[] }[] = [];
  for (const row of rows.results) {
    const options = await env(locals)
      .DB.prepare(
        `SELECT label, text, is_correct FROM mcq_options WHERE mcq_id = ? ORDER BY sort_order, id`,
      )
      .bind(row.id)
      .all<{ label: string; text: string; is_correct: number }>();
    out.push({ ...row, options: options.results });
  }
  return out;
}

/** Publishing checklist — required before status can become published. */
export function publishingChecklist(input: {
  title?: string | null;
  slug?: string | null;
  contentHtml?: string | null;
  subjectId?: number | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  featuredMediaId?: number | null;
  referenceCount?: number;
}): { ok: boolean; items: { label: string; ok: boolean }[] } {
  const items = [
    { label: 'Title', ok: !!input.title?.trim() },
    { label: 'Slug', ok: !!input.slug?.trim() },
    { label: 'Content', ok: (input.contentHtml?.replace(/<[^>]*>/g, '').trim().length ?? 0) > 0 },
    { label: 'Subject', ok: !!input.subjectId },
    { label: 'SEO title', ok: !!input.seoTitle?.trim() },
    { label: 'Meta description', ok: (input.metaDescription?.trim().length ?? 0) >= 50 },
    { label: 'Featured image', ok: !!input.featuredMediaId },
    { label: 'References', ok: (input.referenceCount ?? 0) > 0 },
  ];
  return { ok: items.every((i) => i.ok), items };
}

// ---------------------------------------------------------------------------
// Subjects & topics
// ---------------------------------------------------------------------------

export async function listSubjects(locals: App.Locals, includeInactive = false): Promise<SubjectRow[]> {
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  const rows = await env(locals)
    .DB.prepare(`SELECT * FROM subjects ${where} ORDER BY sort_order, title`)
    .all<SubjectRow>();
  return rows.results;
}

export async function getSubjectBySlug(locals: App.Locals, slug: string): Promise<SubjectRow | null> {
  return (await env(locals).DB.prepare(`SELECT * FROM subjects WHERE slug = ?`).bind(slug).first<SubjectRow>()) ?? null;
}

export async function listTopicsBySubject(locals: App.Locals, subjectId: number): Promise<TopicRow[]> {
  const rows = await env(locals)
    .DB.prepare(`SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order, title`)
    .bind(subjectId)
    .all<TopicRow>();
  return rows.results;
}

/** Redirect lookup: old URL → new URL for slug changes. */
export async function findRedirect(locals: App.Locals, fromPath: string): Promise<string | null> {
  const row = await env(locals)
    .DB.prepare(`SELECT to_path FROM redirects WHERE from_path = ?`)
    .bind(fromPath)
    .first<{ to_path: string }>();
  return row?.to_path ?? null;
}

// ---------------------------------------------------------------------------
// Public site queries (§16: server-rendered, no client JS dependency)
// ---------------------------------------------------------------------------

export interface PublicArticleCard {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  article_type: 'article' | 'study-note';
  published_at: string;
  updated_at: string;
  reading_minutes: number;
  topic_id: number | null;
  subject_title: string;
  subject_slug: string;
}

const CARD_COLS = `a.id, a.title, a.slug, a.excerpt, a.article_type, a.published_at,
  a.updated_at, a.reading_minutes, a.topic_id, s.title AS subject_title, s.slug AS subject_slug`;

/** Published articles for a subject hub, grouped client-side by topic. */
export async function listPublishedBySubject(
  locals: App.Locals,
  subjectId: number,
  opts: { articleType?: 'article' | 'study-note'; page?: number; perPage?: number } = {},
): Promise<{ rows: PublicArticleCard[]; total: number }> {
  const db = env(locals).DB;
  const where = [`a.status = 'published'`, `a.subject_id = ?`];
  const params: unknown[] = [subjectId];
  if (opts.articleType) {
    where.push('a.article_type = ?');
    params.push(opts.articleType);
  }
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(5, opts.perPage ?? 50));

  const total = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles a WHERE ${where.join(' AND ')}`)
    .bind(...params)
    .first<{ n: number }>();
  const rows = await db
    .prepare(
      `SELECT ${CARD_COLS} FROM articles a JOIN subjects s ON s.id = a.subject_id
       WHERE ${where.join(' AND ')} ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...params, perPage, (page - 1) * perPage)
    .all<PublicArticleCard>();
  return { rows: rows.results, total: total?.n ?? 0 };
}

/** Everything published — feeds the dynamic sitemap. */
export async function listAllPublishedForSitemap(
  locals: App.Locals,
): Promise<{ loc: string; lastmod: string }[]> {
  const rows = await env(locals)
    .DB.prepare(
      `SELECT a.slug, s.slug AS subject_slug, a.updated_at, a.published_at
       FROM articles a JOIN subjects s ON s.id = a.subject_id
       WHERE a.status = 'published' AND a.robots LIKE 'index%'`,
    )
    .all<{ slug: string; subject_slug: string; updated_at: string; published_at: string }>();
  return rows.results.map((r) => ({
    loc: `/${r.subject_slug}/${r.slug}/`,
    lastmod: (r.updated_at || r.published_at || '').slice(0, 10),
  }));
}

export async function getMediaById(locals: App.Locals, id: number): Promise<MediaRow | null> {
  return (await env(locals).DB.prepare(`SELECT * FROM media WHERE id = ?`).bind(id).first<MediaRow>()) ?? null;
}

// ---------------------------------------------------------------------------
// Homepage feed (cross-subject, unlike listPublishedBySubject)
// ---------------------------------------------------------------------------

/** A card row plus the featured-media and tag needed to render it. */
export interface PublicFeedCard extends PublicArticleCard {
  media_key: string | null;
  media_alt: string | null;
  tag_name: string | null;
}

/** Most recent published items across all subjects, newest first. */
export async function listPublishedFeed(
  locals: App.Locals,
  opts: { articleType?: 'article' | 'study-note'; limit?: number } = {},
): Promise<PublicFeedCard[]> {
  const where = [`a.status = 'published'`];
  const params: unknown[] = [];
  if (opts.articleType) {
    where.push('a.article_type = ?');
    params.push(opts.articleType);
  }
  const limit = Math.min(24, Math.max(1, opts.limit ?? 6));
  const rows = await env(locals)
    .DB.prepare(
      `SELECT ${CARD_COLS}, m.r2_key AS media_key, m.alt_text AS media_alt,
              (SELECT t.name FROM article_tags at JOIN tags t ON t.id = at.tag_id
               WHERE at.article_id = a.id ORDER BY at.tag_id LIMIT 1) AS tag_name
       FROM articles a
       LEFT JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN media m ON m.id = a.featured_media_id
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT ?`,
    )
    .bind(...params, limit)
    .all<PublicFeedCard>();
  return rows.results;
}

// ---------------------------------------------------------------------------
// Blog stream (article_type='article', organized by optional category)
// ---------------------------------------------------------------------------

/** The three editorial categories a blog article may carry (NULL = none). */
export const BLOG_CATEGORIES = ['study-techniques', 'exam-preparation', 'subject-guides'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** A feed card plus the blog category, for /blog/ listings. */
export interface BlogCard extends PublicFeedCard {
  category: string | null;
}

/** BlogCard plus the author name, for the post page's related rows. */
export interface BlogPostCard extends BlogCard {
  author_name: string | null;
}

/**
 * Published articles with pagination and an optional category filter.
 * `category: null` selects uncategorized articles; leaving `category`
 * undefined returns every article regardless of category.
 */
export async function listPublishedArticles(
  locals: App.Locals,
  opts: { articleType?: 'article' | 'study-note'; category?: string | null; page?: number; perPage?: number } = {},
): Promise<{ rows: BlogPostCard[]; total: number }> {
  const db = env(locals).DB;
  const where = [`a.status = 'published'`];
  const params: unknown[] = [];
  if (opts.articleType) {
    where.push('a.article_type = ?');
    params.push(opts.articleType);
  }
  if (opts.category !== undefined) {
    if (opts.category === null) where.push('a.category IS NULL');
    else {
      where.push('a.category = ?');
      params.push(opts.category);
    }
  }
  const whereSql = where.join(' AND ');
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(5, opts.perPage ?? 12));

  const total = await db
    .prepare(`SELECT COUNT(*) AS n FROM articles a WHERE ${whereSql}`)
    .bind(...params)
    .first<{ n: number }>();
  const rows = await db
    .prepare(
      `SELECT ${CARD_COLS}, a.category, m.r2_key AS media_key, m.alt_text AS media_alt,
              u.display_name AS author_name,
              (SELECT t.name FROM article_tags at JOIN tags t ON t.id = at.tag_id
               WHERE at.article_id = a.id ORDER BY at.tag_id LIMIT 1) AS tag_name
       FROM articles a
       LEFT JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN media m ON m.id = a.featured_media_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE ${whereSql}
       ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...params, perPage, (page - 1) * perPage)
    .all<BlogPostCard>();
  return { rows: rows.results, total: total?.n ?? 0 };
}

/**
 * Published article by slug alone — blog and note URLs are global
 * (/blog/[slug]/, /notes/[slug]/), not subject-scoped.
 */
export async function getPublishedArticleBySlug(
  locals: App.Locals,
  slug: string,
  articleType?: 'article' | 'study-note',
): Promise<
  | (ArticleRow & {
      subject_title: string | null;
      subject_slug: string | null;
      author_name: string | null;
      author_bio: string | null;
    })
  | null
> {
  const row = await env(locals)
    .DB.prepare(
      `SELECT ${ARTICLE_COLS_A},
              s.title AS subject_title, s.slug AS subject_slug,
              u.display_name AS author_name, u.bio AS author_bio
       FROM articles a
       LEFT JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE a.slug = ? AND a.status = 'published' ${articleType ? 'AND a.article_type = ?' : ''}`,
    )
    .bind(...(articleType ? [slug, articleType] : [slug]))
    .first<
      ArticleRow & {
        subject_title: string | null;
        subject_slug: string | null;
        author_name: string | null;
        author_bio: string | null;
      }
    >();
  return row ?? null;
}

/** Newest-published neighbours of an article, for prev/next navigation. */
export async function getPublishedNeighbors(
  locals: App.Locals,
  slug: string,
  articleType?: 'article' | 'study-note',
): Promise<{ older: { slug: string; title: string } | null; newer: { slug: string; title: string } | null }> {
  const db = env(locals).DB;
  const typeSql = articleType ? 'AND article_type = ?' : '';
  // Bind order follows the SQL text: the type filter's ? appears before the
  // slug's ? inside the comparison subquery.
  const params = articleType ? [articleType, slug] : [slug];
  const [older, newer] = await Promise.all([
    db
      .prepare(
        `SELECT slug, title FROM articles
         WHERE status = 'published' ${typeSql}
           AND COALESCE(published_at, created_at) <
               (SELECT COALESCE(published_at, created_at) FROM articles
                WHERE slug = ? AND status = 'published')
         ORDER BY COALESCE(published_at, created_at) DESC LIMIT 1`,
      )
      .bind(...params)
      .first<{ slug: string; title: string }>(),
    db
      .prepare(
        `SELECT slug, title FROM articles
         WHERE status = 'published' ${typeSql}
           AND COALESCE(published_at, created_at) >
               (SELECT COALESCE(published_at, created_at) FROM articles
                WHERE slug = ? AND status = 'published')
         ORDER BY COALESCE(published_at, created_at) ASC LIMIT 1`,
      )
      .bind(...params)
      .first<{ slug: string; title: string }>(),
  ]);
  return { older: older ?? null, newer: newer ?? null };
}

/** Published-article counts per category, for the blog chips and rail. */
export async function listBlogCategoryCounts(
  locals: App.Locals,
): Promise<{ category: string; count: number }[]> {
  const rows = await env(locals)
    .DB.prepare(
      `SELECT a.category, COUNT(*) AS count FROM articles a
       WHERE a.article_type = 'article' AND a.status = 'published' AND a.category IS NOT NULL
       GROUP BY a.category ORDER BY count DESC, a.category`,
    )
    .all<{ category: string; count: number }>();
  return rows.results;
}

/** Same-type published articles sharing at least one tag, newest first. */
export async function listRelatedByTag(
  locals: App.Locals,
  articleId: number,
  articleType: 'article' | 'study-note',
  limit = 3,
): Promise<BlogPostCard[]> {
  const rows = await env(locals)
    .DB.prepare(
      `SELECT ${CARD_COLS}, a.category, m.r2_key AS media_key, m.alt_text AS media_alt,
              u.display_name AS author_name
       FROM articles a
       LEFT JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN media m ON m.id = a.featured_media_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE a.status = 'published' AND a.article_type = ? AND a.id != ?
         AND a.id IN (SELECT at2.article_id FROM article_tags at1
                      JOIN article_tags at2 ON at2.tag_id = at1.tag_id
                      WHERE at1.article_id = ?)
       ORDER BY COALESCE(a.published_at, a.created_at) DESC LIMIT ?`,
    )
    .bind(articleType, articleId, articleId, Math.min(10, Math.max(1, limit)))
    .all<BlogPostCard>();
  return rows.results;
}

/** Subjects with published note/MCQ counts, for the subject grid. */
export async function listSubjectsWithCounts(
  locals: App.Locals,
): Promise<(SubjectRow & { note_count: number; mcq_count: number })[]> {
  const rows = await env(locals)
    .DB.prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM articles a WHERE a.subject_id = s.id
          AND a.status = 'published' AND a.article_type = 'study-note') AS note_count,
        (SELECT COUNT(*) FROM mcqs m WHERE m.subject_id = s.id
          AND m.status = 'published') AS mcq_count
       FROM subjects s WHERE s.is_active = 1 ORDER BY s.sort_order, s.title`,
    )
    .all<SubjectRow & { note_count: number; mcq_count: number }>();
  return rows.results;
}

/** Total published MCQs, for the practice band. */
export async function countPublishedMcqs(locals: App.Locals): Promise<number> {
  const row = await env(locals)
    .DB.prepare(`SELECT COUNT(*) AS n FROM mcqs WHERE status = 'published'`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Published MCQs for one subject — gates practice links on note pages. */
export async function countPublishedMcqsBySubject(
  locals: App.Locals,
  subjectId: number,
): Promise<number> {
  const row = await env(locals)
    .DB.prepare(`SELECT COUNT(*) AS n FROM mcqs WHERE status = 'published' AND subject_id = ?`)
    .bind(subjectId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** All topics (homepage browse column). */
export async function listTopics(locals: App.Locals): Promise<TopicRow[]> {
  const rows = await env(locals)
    .DB.prepare(`SELECT * FROM topics ORDER BY sort_order, title`)
    .all<TopicRow>();
  return rows.results;
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export async function dashboardStats(locals: App.Locals) {
  const db = env(locals).DB;
  const [published, drafts, subjects, mcqs, awaiting, recentEdits, recentPubs] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM articles WHERE status = 'published'`).first<{ n: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM articles WHERE status IN ('draft', 'review', 'scheduled')`).first<{ n: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM subjects WHERE is_active = 1`).first<{ n: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM mcqs WHERE status = 'published'`).first<{ n: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM articles WHERE status = 'review'`).first<{ n: number }>(),
    db
      .prepare(
        `SELECT a.id, a.title, a.status, a.updated_at, u.display_name AS author, s.title AS subject
         FROM articles a
         LEFT JOIN users u ON u.id = a.author_id
         LEFT JOIN subjects s ON s.id = a.subject_id
         WHERE a.status != 'deleted'
         ORDER BY a.updated_at DESC LIMIT 8`,
      )
      .all<{ id: number; title: string; status: string; updated_at: string; author: string | null; subject: string | null }>(),
    db
      .prepare(
        `SELECT a.id, a.title, a.published_at, s.title AS subject
         FROM articles a
         LEFT JOIN subjects s ON s.id = a.subject_id
         WHERE a.status = 'published'
         ORDER BY a.published_at DESC LIMIT 8`,
      )
      .all<{ id: number; title: string; published_at: string; subject: string | null }>(),
  ]);
  return {
    published: published?.n ?? 0,
    drafts: drafts?.n ?? 0,
    subjects: subjects?.n ?? 0,
    mcqs: mcqs?.n ?? 0,
    awaitingReview: awaiting?.n ?? 0,
    recentEdits: recentEdits.results,
    recentPubs: recentPubs.results,
  };
}

// ---------------------------------------------------------------------------
// Write helpers (used by the article API — single source of truth for the
// save/publish/redirect logic so every path stays consistent.)
// ---------------------------------------------------------------------------

export async function saveArticleContent(
  locals: App.Locals,
  articleId: number,
  contentJson: unknown,
): Promise<string> {
  const html = renderTiptapDoc(contentJson);
  const minutes = readingMinutes(contentJson);
  await env(locals)
    .DB.prepare(`UPDATE articles SET content_json = ?, content_html = ?, reading_minutes = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(contentJson ? JSON.stringify(contentJson) : null, html, minutes, articleId)
    .run();
  return html;
}

export async function replaceTags(
  locals: App.Locals,
  articleId: number,
  tagNames: string[],
): Promise<void> {
  const db = env(locals).DB;
  await db.prepare(`DELETE FROM article_tags WHERE article_id = ?`).bind(articleId).run();
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) continue;
    let row = await db.prepare(`SELECT id FROM tags WHERE slug = ?`).bind(slug).first<{ id: number }>();
    if (!row) {
      const res = await db.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`).bind(name, slug).run();
      row = { id: res.meta?.last_row_id as number };
    }
    await db
      .prepare(`INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)`)
      .bind(articleId, row.id)
      .run();
  }
}

export async function replaceRelated(
  locals: App.Locals,
  articleId: number,
  relatedIds: number[],
): Promise<void> {
  const db = env(locals).DB;
  await db.prepare(`DELETE FROM article_related WHERE article_id = ?`).bind(articleId).run();
  for (const id of relatedIds) {
    if (id === articleId) continue;
    await db
      .prepare(`INSERT OR IGNORE INTO article_related (article_id, related_article_id) VALUES (?, ?)`)
      .bind(articleId, id)
      .run();
  }
}

export async function replaceArticleReferences(
  locals: App.Locals,
  articleId: number,
  referenceIds: number[],
): Promise<void> {
  const db = env(locals).DB;
  await db.prepare(`DELETE FROM article_references WHERE article_id = ?`).bind(articleId).run();
  let order = 0;
  for (const id of referenceIds) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO article_references (article_id, reference_id, sort_order) VALUES (?, ?, ?)`,
      )
      .bind(articleId, id, order++)
      .run();
  }
}

/**
 * Slug-change redirect: when a published article's slug (or subject) changes,
 * insert a redirect row from the old public URL to the new one.
 */
export async function recordSlugRedirect(
  locals: App.Locals,
  articleId: number,
  oldPath: string,
  newPath: string,
): Promise<void> {
  if (oldPath === newPath) return;
  const db = env(locals).DB;
  await db
    .prepare(
      `INSERT INTO redirects (from_path, to_path, article_id, reason) VALUES (?, ?, ?, 'slug-change')
       ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path, article_id = excluded.article_id`,
    )
    .bind(oldPath, newPath, articleId)
    .run();
}

/** Snapshot an article into revisions (full JSON copy). */
export async function createRevision(
  locals: App.Locals,
  articleId: number,
  note: string,
): Promise<void> {
  const article = await getArticleById(locals, articleId);
  if (!article) throw new HttpError(404, 'Article not found.');
  const extras = await getArticleExtras(locals, articleId);
  const snapshot = { ...article, tags: extras.tags, references: extras.references.map((r) => r.id) };
  await env(locals)
    .DB.prepare(`INSERT INTO revisions (article_id, created_by, note, snapshot_json) VALUES (?, ?, ?, ?)`)
    .bind(articleId, locals.user?.id ?? null, note, JSON.stringify(snapshot))
    .run();
}

export async function countReferences(locals: App.Locals, articleId: number): Promise<number> {
  const row = await env(locals)
    .DB.prepare(`SELECT COUNT(*) AS n FROM article_references WHERE article_id = ?`)
    .bind(articleId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
