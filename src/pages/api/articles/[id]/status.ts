/**
 * POST /api/articles/:id/status/ — workflow transitions (§11):
 *   { status: 'draft' | 'review' | 'published' | 'unpublished' | 'scheduled',
 *     scheduledAt?: ISO string }
 *
 * Publishing enforces the checklist server-side (§11: prevent accidental
 * publication when required SEO fields are missing).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission, can } from '../../../utils/auth';
import { articleStatusSchema } from '../../../utils/validate';
import {
  getArticleById,
  getArticleExtras,
  createRevision,
  countReferences,
  publishingChecklist,
  recordSlugRedirect,
} from '../../../utils/content';
import { audit } from '../../../utils/audit';

export const prerender = false;

async function subjectSlugById(locals: import('astro').App.Locals, subjectId: number | null): Promise<string | null> {
  if (!subjectId) return null;
  const row = await env(locals).DB.prepare(`SELECT slug FROM subjects WHERE id = ?`).bind(subjectId).first<{ slug: string }>();
  return row?.slug ?? null;
}

export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    const user = requirePermission(locals, 'articles:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid article id.');

    const body = await request.json().catch(() => null);
    const parsed = articleStatusSchema.safeParse(body?.status);
    if (!parsed.success || parsed.data === 'deleted') {
      throw new HttpError(400, "status must be draft, review, published, unpublished, or scheduled.");
    }
    const status = parsed.data;
    let scheduledAt: string | null = null;
    if (status === 'scheduled') {
      const s = typeof body?.scheduledAt === 'string' ? body.scheduledAt : '';
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
        throw new HttpError(400, 'scheduledAt is required (ISO datetime) for scheduling.');
      }
      scheduledAt = new Date(s).toISOString();
    }

    const article = await getArticleById(locals, id);
    if (!article || article.status === 'deleted') throw new HttpError(404, 'Article not found.');

    // --- publishing gate ----------------------------------------------------
    if (status === 'published') {
      if (!can(user, 'articles:publish')) {
        throw new HttpError(403, 'Requires articles:publish permission.');
      }
      const refCount = await countReferences(locals, id);
      const checklist = publishingChecklist({
        title: article.title,
        slug: article.slug,
        contentHtml: article.content_html,
        subjectId: article.subject_id,
        seoTitle: article.seo_title,
        metaDescription: article.meta_description,
        featuredMediaId: article.featured_media_id,
        referenceCount: refCount,
      });
      if (!checklist.ok) {
        const missing = checklist.items.filter((i) => !i.ok).map((i) => i.label);
        return json(
          { error: `Cannot publish: missing ${missing.join(', ')}.`, checklist },
          { status: 422 },
        );
      }
      // First publication of a scheduled article records the actual date.
      await createRevision(locals, id, 'before-publish');
      await env(locals)
        .DB.prepare(
          `UPDATE articles SET status = 'published', published_at = COALESCE(published_at, datetime('now')), updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(id)
        .run();
      await audit(locals, 'article.publish', 'article', id, { title: article.title });
      return json({ ok: true, status: 'published' });
    }

    // --- other transitions ---------------------------------------------------
    const publishedAtSql =
      status === 'unpublished' ? `, published_at = published_at` : '';
    await createRevision(locals, id, `before-${status}`);
    await env(locals)
      .DB.prepare(
        `UPDATE articles SET status = ?, scheduled_at = ?, updated_at = datetime('now')${publishedAtSql} WHERE id = ?`,
      )
      .bind(status, scheduledAt, id)
      .run();
    await audit(locals, `article.${status}`, 'article', id, { title: article.title });
    return json({ ok: true, status });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
