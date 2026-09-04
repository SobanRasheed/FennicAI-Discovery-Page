/**
 * Single subject / topic API.
 * PUT    /api/subjects/:id/            — update subject
 * DELETE /api/subjects/:id/            — delete subject (soft: is_active=0)
 * PUT    /api/subjects/:id/?type=topic&topicId=N — update topic
 * DELETE /api/subjects/:id/?type=topic&topicId=N — delete topic
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, subjectInputSchema, topicInputSchema } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const PUT: APIRoute = async ({ request, locals, params, url }) => {
  try {
    requirePermission(locals, 'subjects:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid id.');

    if (url.searchParams.get('type') === 'topic') {
      const topicId = Number(url.searchParams.get('topicId'));
      if (!/^\d+$/.test(String(url.searchParams.get('topicId')))) throw new HttpError(400, 'topicId required.');
      const input = await parseBody(request, topicInputSchema);
      const db = env(locals).DB;
      const dupe = await db
        .prepare(`SELECT id FROM topics WHERE subject_id = ? AND slug = ? AND id != ?`)
        .bind(input.subjectId, input.slug, topicId)
        .first<{ id: number }>();
      if (dupe) throw new HttpError(409, 'A topic with this slug exists in the subject.');
      await db
        .prepare(
          `UPDATE topics SET subject_id = ?, parent_topic_id = ?, title = ?, slug = ?, description = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(input.subjectId, input.parentTopicId ?? null, input.title, input.slug, input.description, input.sortOrder, topicId)
        .run();
      await audit(locals, 'topic.update', 'topic', topicId, { title: input.title });
      return json({ ok: true });
    }

    const input = await parseBody(request, subjectInputSchema);
    const db = env(locals).DB;
    const dupe = await db
      .prepare(`SELECT id FROM subjects WHERE slug = ? AND id != ?`)
      .bind(input.slug, id)
      .first<{ id: number }>();
    if (dupe) throw new HttpError(409, 'A subject with this slug already exists.');
    await db
      .prepare(
        `UPDATE subjects SET title = ?, slug = ?, description = ?, introduction = ?, image_media_id = ?,
                            seo_title = ?, seo_description = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        input.title,
        input.slug,
        input.description,
        input.introduction,
        input.imageMediaId ?? null,
        input.seoTitle ?? null,
        input.seoDescription ?? null,
        input.sortOrder,
        input.isActive ? 1 : 0,
        id,
      )
      .run();
    await audit(locals, 'subject.update', 'subject', id, { title: input.title });
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const DELETE: APIRoute = async ({ locals, params, url }) => {
  try {
    requirePermission(locals, 'subjects:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid id.');

    if (url.searchParams.get('type') === 'topic') {
      const topicId = Number(url.searchParams.get('topicId'));
      if (!/^\d+$/.test(String(url.searchParams.get('topicId')))) throw new HttpError(400, 'topicId required.');
      // Only delete topics with no published articles attached.
      const inUse = await env(locals)
        .DB.prepare(`SELECT COUNT(*) AS n FROM articles WHERE topic_id = ? AND status != 'deleted'`)
        .bind(topicId)
        .first<{ n: number }>();
      if ((inUse?.n ?? 0) > 0) {
        throw new HttpError(409, 'Topic has articles attached; move them first.');
      }
      await env(locals).DB.prepare(`DELETE FROM topics WHERE id = ?`).bind(topicId).run();
      await audit(locals, 'topic.delete', 'topic', topicId, { subjectId: id });
      return json({ ok: true });
    }

    // Subject delete is soft: articles keep their subject_id reference but
    // the subject leaves the taxonomy (is_active = 0).
    const inUse = await env(locals)
      .DB.prepare(`SELECT COUNT(*) AS n FROM articles WHERE subject_id = ? AND status != 'deleted'`)
      .bind(id)
      .first<{ n: number }>();
    if ((inUse?.n ?? 0) > 0) {
      throw new HttpError(409, 'Subject has articles attached; move or delete them first.');
    }
    await env(locals)
      .DB.prepare(`UPDATE subjects SET is_active = 0, updated_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
    await audit(locals, 'subject.delete', 'subject', id, {});
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
