/**
 * Global CMS search across articles, MCQs, subjects, and topics with the
 * admin filters from §12 (status, subject, date, author, content type) and
 * pagination. Used by /api/search and the admin search page.
 */
import type { App } from 'astro';
import { env } from './backend';

export interface SearchHit {
  type: 'article' | 'study-note' | 'mcq' | 'subject' | 'topic';
  id: number;
  title: string;
  url: string; // admin edit URL
  publicUrl: string | null;
  status: string;
  subject: string | null;
  author: string | null;
  updated_at: string;
}

export async function cmsSearch(
  locals: App.Locals,
  opts: {
    q?: string;
    status?: string;
    subjectId?: number;
    authorId?: number;
    contentType?: 'article' | 'study-note' | 'mcq' | 'subject' | 'topic';
    since?: string; // ISO date
    page?: number;
    perPage?: number;
  },
): Promise<{ hits: SearchHit[]; total: number; page: number; perPage: number }> {
  const db = env(locals).DB;
  const q = opts.q?.trim().toLowerCase();
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(50, Math.max(5, opts.perPage ?? 20));
  const offset = (page - 1) * perPage;

  const wants = (type: string) => !opts.contentType || opts.contentType === type;

  const unionParts: string[] = [];
  const params: unknown[] = [];

  // Articles + study notes
  if (wants('article') || wants('study-note')) {
    const where: string[] = [`a.status != 'deleted'`];
    if (q) {
      where.push('(LOWER(a.title) LIKE ? OR LOWER(a.excerpt) LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (opts.status) {
      where.push('a.status = ?');
      params.push(opts.status);
    }
    if (opts.subjectId) {
      where.push('a.subject_id = ?');
      params.push(opts.subjectId);
    }
    if (opts.authorId) {
      where.push('a.author_id = ?');
      params.push(opts.authorId);
    }
    if (opts.since) {
      where.push('a.updated_at >= ?');
      params.push(opts.since);
    }
    const typeFilter = opts.contentType ? `AND a.article_type = ?` : '';
    if (opts.contentType) params.push(opts.contentType);
    unionParts.push(
      `SELECT 'article' AS type, a.id, a.title, a.status, a.updated_at,
              a.slug, a.article_type,
              s.title AS subject, u.display_name AS author
       FROM articles a
       LEFT JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN users u ON u.id = a.author_id
       WHERE ${where.join(' AND ')} ${typeFilter}`,
    );
  }

  // MCQs
  if (wants('mcq')) {
    const where: string[] = [`m.status != 'deleted'`];
    if (q) {
      where.push('(LOWER(m.question) LIKE ? OR LOWER(m.explanation) LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (opts.status) {
      where.push('m.status = ?');
      params.push(opts.status);
    }
    if (opts.subjectId) {
      where.push('m.subject_id = ?');
      params.push(opts.subjectId);
    }
    if (opts.since) {
      where.push('m.updated_at >= ?');
      params.push(opts.since);
    }
    unionParts.push(
      `SELECT 'mcq' AS type, m.id, m.question AS title, m.status, m.updated_at,
              NULL AS slug, NULL AS article_type,
              s.title AS subject, u.display_name AS author
       FROM mcqs m
       LEFT JOIN subjects s ON s.id = m.subject_id
       LEFT JOIN users u ON u.id = m.created_by
       WHERE ${where.join(' AND ')}`,
    );
  }

  // Subjects
  if (wants('subject')) {
    const where: string[] = ['1=1'];
    if (q) {
      where.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    unionParts.push(
      `SELECT 'subject' AS type, id, title, 'active' AS status, updated_at,
              slug, NULL AS article_type, NULL AS subject, NULL AS author
       FROM subjects WHERE ${where.join(' AND ')}`,
    );
  }

  // Topics
  if (wants('topic')) {
    const where: string[] = ['1=1'];
    if (q) {
      where.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    unionParts.push(
      `SELECT 'topic' AS type, t.id, t.title, 'active' AS status, t.updated_at,
              t.slug, NULL AS article_type, s.title AS subject, NULL AS author
       FROM topics t JOIN subjects s ON s.id = t.subject_id
       WHERE ${where.join(' AND ')}`,
    );
  }

  if (unionParts.length === 0) {
    return { hits: [], total: 0, page, perPage };
  }

  const unionSql = unionParts.join(' UNION ALL ');
  // COUNT wraps the union; bind params once for count, once for the page.
  const countParams = [...params];
  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM (${unionSql})`)
    .bind(...countParams)
    .first<{ total: number }>();

  const rows = await db
    .prepare(`${unionSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .bind(...params, perPage, offset)
    .all<{
      type: string;
      id: number;
      title: string;
      status: string;
      updated_at: string;
      slug: string | null;
      article_type: string | null;
      subject: string | null;
      author: string | null;
    }>();

  const hits: SearchHit[] = rows.results.map((r) => {
    const adminUrl =
      r.type === 'mcq'
        ? `/admin/mcqs/${r.id}/`
        : r.type === 'subject'
          ? `/admin/subjects/`
          : r.type === 'topic'
            ? `/admin/subjects/`
            : `/admin/articles/${r.id}/`;
    return {
      type: (r.article_type === 'study-note' ? 'study-note' : r.type) as SearchHit['type'],
      id: r.id,
      title: r.title,
      url: adminUrl,
      publicUrl: null, // filled per-type below where computable
      status: r.status,
      subject: r.subject,
      author: r.author,
      updated_at: r.updated_at,
    };
  });

  return { hits, total: totalRow?.total ?? 0, page, perPage };
}
