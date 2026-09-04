/**
 * Single MCQ API.
 * GET    /api/mcqs/:id/  — question + options
 * PUT    /api/mcqs/:id/  — update (replaces options atomically)
 * DELETE /api/mcqs/:id/  — soft delete
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, mcqInputSchema } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

async function loadMcq(locals: import('astro').App.Locals, id: number) {
  const db = env(locals).DB;
  const mcq = await db.prepare(`SELECT * FROM mcqs WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!mcq || mcq.status === 'deleted') throw new HttpError(404, 'MCQ not found.');
  const options = await db
    .prepare(`SELECT label, text, is_correct FROM mcq_options WHERE mcq_id = ? ORDER BY sort_order, id`)
    .bind(id)
    .all<{ label: string; text: string; is_correct: number }>();
  return { mcq, options: options.results };
}

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'mcqs:read');
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid MCQ id.');
    const { mcq, options } = await loadMcq(locals, id);
    return json({
      mcq: { ...mcq, tags: JSON.parse((mcq.tags_json as string) ?? '[]') },
      options: options.map((o) => ({ ...o, isCorrect: !!o.is_correct })),
    });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  try {
    requirePermission(locals, 'mcqs:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid MCQ id.');
    await loadMcq(locals, id); // 404 check

    const input = await parseBody(request, mcqInputSchema);
    const correctCount = input.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new HttpError(400, 'Exactly one option must be marked correct.');
    }

    const db = env(locals).DB;
    await db
      .prepare(
        `UPDATE mcqs SET question = ?, explanation = ?, subject_id = ?, topic_id = ?, article_id = ?,
                        difficulty = ?, tags_json = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(
        input.question,
        input.explanation,
        input.subjectId ?? null,
        input.topicId ?? null,
        input.articleId ?? null,
        input.difficulty,
        JSON.stringify(input.tagNames),
        id,
      )
      .run();

    // Replace options atomically with the question update.
    await db.prepare(`DELETE FROM mcq_options WHERE mcq_id = ?`).bind(id).run();
    await db
      .prepare(
        `INSERT INTO mcq_options (mcq_id, label, text, is_correct, sort_order) VALUES ${input.options
          .map(() => '(?, ?, ?, ?, ?)')
          .join(', ')}`,
      )
      .bind(...input.options.flatMap((o, i) => [id, o.label, o.text, o.isCorrect ? 1 : 0, i]))
      .run();

    await audit(locals, 'mcq.update', 'mcq', id, { question: input.question });
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'mcqs:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid MCQ id.');
    const { mcq } = await loadMcq(locals, id);
    await env(locals)
      .DB.prepare(`UPDATE mcqs SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`)
      .bind(id)
      .run();
    await audit(locals, 'mcq.delete', 'mcq', id, { question: mcq.question });
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
