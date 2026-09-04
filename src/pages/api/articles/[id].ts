/**
 * Single article API.
 * GET    /api/articles/:id/  — full article + tags/related/references (editor load)
 * PUT    /api/articles/:id/  — full update (autosave and manual save both land here)
 * DELETE /api/articles/:id/  — soft delete (status='deleted', restorable)
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, articleInputSchema } from '../../../utils/validate';
import {
  getArticleById,
  getArticleExtras,
  listArticles,
  saveArticleContent,
  replaceTags,
  replaceRelated,
  replaceArticleReferences,
  createRevision,
  recordSlugRedirect,
  getSubjectBySlug,
} from '../../../utils/content';
import { audit } from '../../../utils/audit';

export const prerender = false;

async function subjectSlugById(locals: import('astro').App.Locals, subjectId: number | null): Promise<string | null> {
  if (!subjectId) return null;
  const row = await env(locals).DB.prepare(`SELECT slug FROM subjects WHERE id = ?`).bind(subjectId).first<{ slug: string }>();
  return row?.slug ?? null;
}

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'articles:read');
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid article id.');
    const article = await getArticleById(locals, id);
    if (!article || article.status === 'deleted') throw new HttpError(404, 'Article not found.');
    const extras = await getArticleExtras(locals, id);
    return json({
      article: {
        ...article,
        content_json: article.content_json ? JSON.parse(article.content_json) : null,
      },
      tags: extras.tags,
      related: extras.related,
      references: extras.references,
    });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  try {
    requirePermission(locals, 'articles:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid article id.');

    const existing = await getArticleById(locals, id);
    if (!existing || existing.status === 'deleted') throw new HttpError(404, 'Article not found.');

    const input = await parseBody(request, articleInputSchema);
    const db = env(locals).DB;

    // Slug uniqueness across non-deleted articles (excluding this one).
    const collision = await db
      .prepare(
        `SELECT id FROM articles WHERE subject_id IS ? AND slug = ? AND status != 'deleted' AND id != ?`,
      )
      .bind(input.subjectId ?? null, input.slug, id)
      .first<{ id: number }>();
    if (collision) {
      throw new HttpError(409, 'Another article with this slug already exists under that subject.');
    }

    // Revisions snapshot of the pre-update state on every manual save.
    await createRevision(locals, id, 'before-update');

    // Re-render content: saveArticleContent sanitizes and stores both the
    // JSON source and the public HTML; absent JSON clears the content.
    if (input.contentJson) {
      await saveArticleContent(locals, id, input.contentJson);
    } else {
      await db
        .prepare(`UPDATE articles SET content_json = NULL, content_html = '', reading_minutes = 0 WHERE id = ?`)
        .bind(id)
        .run();
    }

    await db
      .prepare(
        `UPDATE articles SET
           title = ?, slug = ?, excerpt = ?, article_type = ?, subject_id = ?, topic_id = ?,
           author_id = ?, featured_media_id = ?, scheduled_at = ?, seo_title = ?,
           meta_description = ?, canonical_url = ?, og_title = ?, og_description = ?,
           og_image_media_id = ?, robots = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        input.title,
        input.slug,
        input.excerpt,
        input.articleType,
        input.subjectId ?? null,
        input.topicId ?? null,
        input.authorId ?? null,
        input.featuredMediaId ?? null,
        input.scheduledAt ?? null,
        input.seoTitle ?? null,
        input.metaDescription ?? null,
        input.canonicalUrl ?? null,
        input.ogTitle ?? null,
        input.ogDescription ?? null,
        input.ogImageMediaId ?? null,
        input.robots,
        id,
      )
      .run();

    // Render content (idempotent; saveArticleContent already did it when
    // contentJson was provided — this also handles the null case).
    if (!input.contentJson) {
      await db
        .prepare(`UPDATE articles SET content_json = NULL, content_html = '', reading_minutes = 0 WHERE id = ?`)
        .bind(id)
        .run();
    }

    await replaceTags(locals, id, input.tagNames);
    await replaceRelated(locals, id, input.relatedArticleIds);
    await replaceArticleReferences(locals, id, input.referenceIds);

    // Slug/subject change on a published article → redirect from the old URL.
    if (existing.status === 'published') {
      const [oldSubject, newSubject] = await Promise.all([
        subjectSlugById(locals, existing.subject_id),
        subjectSlugById(locals, input.subjectId ?? null),
      ]);
      if (oldSubject && newSubject && (existing.slug !== input.slug || oldSubject !== newSubject)) {
        await recordSlugRedirect(
          locals,
          id,
          `/${oldSubject}/${existing.slug}/`,
          `/${newSubject}/${input.slug}/`,
        );
      }
    }

    const updated = await getArticleById(locals, id);
    const extras = await getArticleExtras(locals, id);
    await audit(locals, 'article.update', 'article', id, { title: input.title });
    return json({
      article: {
        ...updated,
        content_json: updated?.content_json ? JSON.parse(updated.content_json) : null,
      },
      tags: extras.tags,
      references: extras.references,
      related: extras.related,
    });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'articles:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid article id.');
    const article = await getArticleById(locals, id);
    if (!article) throw new HttpError(404, 'Article not found.');
    await createRevision(locals, id, 'before-delete');
    await env(locals)
      .DB.prepare(`UPDATE articles SET status = 'deleted', deleted_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
    await audit(locals, 'article.delete', 'article', id, { title: article.title });
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
