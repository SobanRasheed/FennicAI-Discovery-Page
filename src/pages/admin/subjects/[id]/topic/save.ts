/**
 * POST /admin/subjects/:id/topic/save/ — no-JS topic save, server-validated.
 */
import { env } from '../../../../utils/backend';
import { audit } from '../../../../utils/audit';

export const prerender = false;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const POST: import('astro').APIRoute = async ({ params, request, locals, redirect }) => {
  const subjectId = Number(params.id);
  const back = (msg: string) =>
    redirect(`/admin/subjects/${subjectId}/topic/new/?error=${encodeURIComponent(msg)}`, 303);
  try {
    if (!locals.user || !/^\d+$/.test(String(params.id))) return redirect('/admin/subjects/', 303);
    const form = await request.formData();
    const topicIdRaw = String(form.get('topicId') ?? '');
    const topicId = /^\d+$/.test(topicIdRaw) ? Number(topicIdRaw) : null;

    const title = String(form.get('title') ?? '').trim();
    const slug = String(form.get('slug') ?? '').trim();
    if (!title || !SLUG_RE.test(slug)) return back('Title and a valid slug are required.');

    const parentRaw = String(form.get('parentTopicId') ?? '');
    const parentTopicId = /^\d+$/.test(parentRaw) ? Number(parentRaw) : null;

    const db = env(locals).DB;
    const dupe = await db
      .prepare(`SELECT id FROM topics WHERE subject_id = ? AND slug = ?${topicId ? ' AND id != ?' : ''}`)
      .bind(...(topicId ? [subjectId, slug, topicId] : [subjectId, slug]))
      .first<{ id: number }>();
    if (dupe) return back('A topic with this slug exists in this subject.');

    const description = String(form.get('description') ?? '').slice(0, 400);
    const sortOrder = Math.max(0, Number(form.get('sortOrder')) || 0);

    if (topicId) {
      await db
        .prepare(
          `UPDATE topics SET subject_id = ?, parent_topic_id = ?, title = ?, slug = ?, description = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(subjectId, parentTopicId, title, slug, description, sortOrder, topicId)
        .run();
      await audit(locals, 'topic.update', 'topic', topicId, { title });
    } else {
      const result = await db
        .prepare(
          `INSERT INTO topics (subject_id, parent_topic_id, title, slug, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(subjectId, parentTopicId, title, slug, description, sortOrder)
        .run();
      await audit(locals, 'topic.create', 'topic', result.meta?.last_row_id as number, { title, subjectId });
    }
    return redirect('/admin/subjects/', 303);
  } catch (err) {
    return back((err as Error).message || 'Save failed.');
  }
};
