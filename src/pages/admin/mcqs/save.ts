/**
 * POST /admin/mcqs/save/ — no-JS MCQ save handler with the same server-side
 * validation rules as the REST API (exactly one correct option, required
 * fields, status transitions; publishing requires an explanation).
 */
import { env, HttpError } from '../../../utils/backend';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  try {
    if (!locals.user) return redirect('/admin/login/', 303);
    const form = await request.formData();
    const idRaw = String(form.get('id') ?? '');
    const id = /^\d+$/.test(idRaw) ? Number(idRaw) : null;

    const question = String(form.get('question') ?? '').trim();
    const explanation = String(form.get('explanation') ?? '').trim();
    const difficulty = ['easy', 'medium', 'hard'].includes(String(form.get('difficulty')))
      ? String(form.get('difficulty'))
      : 'medium';
    const subjectId = /^\d+$/.test(String(form.get('subjectId') ?? '')) ? Number(form.get('subjectId')) : null;
    const topicId = /^\d+$/.test(String(form.get('topicId') ?? '')) ? Number(form.get('topicId')) : null;
    const tagNames = String(form.get('tagNames') ?? '')
      .split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20);

    const options: { label: string; text: string; isCorrect: boolean }[] = [];
    for (let i = 0; i < 10; i++) {
      const text = String(form.get(`option-${i}`) ?? '').trim();
      if (!text) continue;
      options.push({ label: 'ABCDEFGH'[i], text, isCorrect: form.get('correct') === String(i) });
    }
    if (!question || options.length < 2) {
      return redirect(`/admin/mcqs/${id ? `${id}/` : 'new/'}?error=${encodeURIComponent('Question and at least 2 options are required.')}`, 303);
    }
    if (options.filter((o) => o.isCorrect).length !== 1) {
      return redirect(`/admin/mcqs/${id ? `${id}/` : 'new/'}?error=${encodeURIComponent('Mark exactly one correct option.')}`, 303);
    }

    const db = env(locals).DB;

    let mcqId = id;
    if (id) {
      await db
        .prepare(
          `UPDATE mcqs SET question = ?, explanation = ?, difficulty = ?, subject_id = ?, topic_id = ?, tags_json = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(question, explanation, difficulty, subjectId, topicId, JSON.stringify(tagNames), id)
        .run();
      await db.prepare(`DELETE FROM mcq_options WHERE mcq_id = ?`).bind(id).run();
    } else {
      const result = await db
        .prepare(
          `INSERT INTO mcqs (question, explanation, difficulty, subject_id, topic_id, tags_json, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(question, explanation, difficulty, subjectId, topicId, JSON.stringify(tagNames), locals.user.id)
        .run();
      mcqId = result.meta?.last_row_id as number;
    }

    await db
      .prepare(
        `INSERT INTO mcq_options (mcq_id, label, text, is_correct, sort_order) VALUES ${options.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
      )
      .bind(...options.flatMap((o, i) => [mcqId, o.label, o.text, o.isCorrect ? 1 : 0, i]))
      .run();

    // Optional status transitions (publish requires an explanation, §8).
    if (form.get('publish')) {
      if (!explanation) {
        return redirect(`/admin/mcqs/${mcqId}/?error=${encodeURIComponent('Cannot publish without an explanation.')}`, 303);
      }
      await db.prepare(`UPDATE mcqs SET status = 'published' WHERE id = ?`).bind(mcqId).run();
    } else if (form.get('unpublish')) {
      await db.prepare(`UPDATE mcqs SET status = 'unpublished' WHERE id = ?`).bind(mcqId).run();
    }

    await audit(locals, id ? 'mcq.update' : 'mcq.create', 'mcq', mcqId, { question });
    return redirect(`/admin/mcqs/${mcqId}/`, 303);
  } catch (err) {
    const message = encodeURIComponent((err as Error).message || 'Save failed.');
    return redirect(`/admin/mcqs/?error=${message}`, 303);
  }
};
