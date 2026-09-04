/**
 * Internal-link suggestions (§7): GET /api/link-suggestions/?q=&subjectId=&excludeId=
 * Returns published articles matching a title search, or the best related
 * candidates by subject/topic for the article being edited.
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../utils/backend';
import { requirePermission } from '../../utils/auth';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'articles:read');
    const db = env(locals).DB;
    const q = url.searchParams.get('q')?.trim().toLowerCase();
    const excludeId = Number(url.searchParams.get('excludeId')) || null;
    const subjectId = Number(url.searchParams.get('subjectId')) || null;

    let rows: {
      id: number;
      title: string;
      slug: string;
      subject_slug: string;
      subject: string;
    }[] = [];

    if (q) {
      const result = await db
        .prepare(
          `SELECT a.id, a.title, a.slug, s.slug AS subject_slug, s.title AS subject
           FROM articles a JOIN subjects s ON s.id = a.subject_id
           WHERE a.status = 'published' AND a.id != COALESCE(?, -1) AND LOWER(a.title) LIKE ?
           ORDER BY a.published_at DESC LIMIT 20`,
        )
        .bind(excludeId, `%${q}%`)
        .all();
      rows = result.results as typeof rows;
    } else {
      // Related suggestions: same subject, same topic, or shared tags.
      const result = await db
        .prepare(
          `SELECT DISTINCT a.id, a.title, a.slug, s.slug AS subject_slug, s.title AS subject
           FROM articles a
           JOIN subjects s ON s.id = a.subject_id
           WHERE a.status = 'published'
             AND a.id != COALESCE(?, -1)
             AND (a.subject_id = COALESCE(?, a.subject_id) OR a.topic_id = COALESCE(?, -1)
                  OR a.id IN (
                    SELECT at2.article_id FROM article_tags at1
                    JOIN article_tags at2 ON at2.tag_id = at1.tag_id
                    WHERE at1.article_id = COALESCE(?, -1)
                  ))
           ORDER BY a.published_at DESC LIMIT 20`,
        )
        .bind(excludeId, subjectId, null, excludeId)
        .all();
      rows = result.results as typeof rows;
    }

    return json({
      suggestions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        url: `/${r.subject_slug}/${r.slug}/`,
        subject: r.subject,
      })),
    });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
