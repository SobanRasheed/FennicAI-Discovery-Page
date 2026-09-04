/**
 * Subject + topic API (§5).
 * GET  /api/subjects/  — subjects with their topics
 * POST /api/subjects/  — create subject
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, subjectInputSchema, topicInputSchema } from '../../../utils/validate';
import { listSubjects, listTopicsBySubject } from '../../../utils/content';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'subjects:read');
    // /api/subjects/?topicSubjectId=N → topics for one subject (editor pickers)
    const topicSubjectId = url.searchParams.get('topicSubjectId');
    if (topicSubjectId && /^\d+$/.test(topicSubjectId)) {
      return json({ topics: await listTopicsBySubject(locals, Number(topicSubjectId)) });
    }
    const subjects = await listSubjects(locals, true);
    const withTopics = await Promise.all(
      subjects.map(async (s) => ({
        ...s,
        topics: await listTopicsBySubject(locals, s.id),
      })),
    );
    return json({ subjects: withTopics });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    requirePermission(locals, 'subjects:write');
    assertCsrf(locals);

    // /api/subjects/?type=topic → create a topic under a subject.
    if (url.searchParams.get('type') === 'topic') {
      const input = await parseBody(request, topicInputSchema);
      const db = env(locals).DB;
      const dupe = await db
        .prepare(`SELECT id FROM topics WHERE subject_id = ? AND slug = ?`)
        .bind(input.subjectId, input.slug)
        .first<{ id: number }>();
      if (dupe) throw new HttpError(409, 'A topic with this slug exists in the subject.');
      const result = await db
        .prepare(
          `INSERT INTO topics (subject_id, parent_topic_id, title, slug, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(input.subjectId, input.parentTopicId ?? null, input.title, input.slug, input.description, input.sortOrder)
        .run();
      const id = result.meta?.last_row_id as number;
      await audit(locals, 'topic.create', 'topic', id, { title: input.title, subjectId: input.subjectId });
      return json({ id }, { status: 201 });
    }

    const input = await parseBody(request, subjectInputSchema);
    const db = env(locals).DB;
    const dupe = await db.prepare(`SELECT id FROM subjects WHERE slug = ?`).bind(input.slug).first<{ id: number }>();
    if (dupe) throw new HttpError(409, 'A subject with this slug already exists.');
    const result = await db
      .prepare(
        `INSERT INTO subjects (title, slug, description, introduction, image_media_id, seo_title, seo_description, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      )
      .run();
    const id = result.meta?.last_row_id as number;
    await audit(locals, 'subject.create', 'subject', id, { title: input.title });
    return json({ id }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
