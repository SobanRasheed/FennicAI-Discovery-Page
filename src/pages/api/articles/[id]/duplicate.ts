/**
 * POST /api/articles/:id/duplicate/ — copy an article into a new draft.
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../../utils/auth';
import { getArticleById, getArticleExtras, replaceTags, replaceArticleReferences } from '../../../../utils/content';
import { audit } from '../../../../utils/audit';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'articles:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid article id.');
    const source = await getArticleById(locals, id);
    if (!source) throw new HttpError(404, 'Article not found.');

    const db = env(locals).DB;

    // Find a free slug: source slug + -copy, -copy-2, ...
    let slug = `${source.slug}-copy`;
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const taken = await db
        .prepare(`SELECT id FROM articles WHERE subject_id IS ? AND slug = ? AND status != 'deleted'`)
        .bind(source.subject_id ?? null, slug)
        .first<{ id: number }>();
      if (!taken) break;
      slug = `${source.slug}-copy-${suffix++}`;
    }

    const result = await db
      .prepare(
        `INSERT INTO articles
           (title, slug, excerpt, content_json, content_html, article_type, status,
            subject_id, topic_id, author_id, featured_media_id, seo_title,
            meta_description, canonical_url, og_title, og_description,
            og_image_media_id, robots, reading_minutes)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `${source.title} (copy)`,
        slug,
        source.excerpt,
        source.content_json,
        source.content_html,
        source.article_type,
        source.subject_id ?? null,
        source.topic_id ?? null,
        locals.user?.id ?? null,
        source.featured_media_id ?? null,
        source.seo_title ?? null,
        source.meta_description ?? null,
        null, // canonical URL must never be duplicated
        source.og_title ?? null,
        source.og_description ?? null,
        source.og_image_media_id ?? null,
        source.robots,
        source.reading_minutes,
      )
      .run();
    const newId = result.meta?.last_row_id as number;

    const extras = await getArticleExtras(locals, id);
    await replaceTags(locals, newId, extras.tags);
    await replaceArticleReferences(locals, newId, extras.references.map((r) => r.id));

    await audit(locals, 'article.duplicate', 'article', newId, { sourceId: id });
    return json({ id: newId, slug }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
