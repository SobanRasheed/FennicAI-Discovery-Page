/**
 * MCQ API (§8).
 * GET  /api/mcqs/  — list with filters + pagination
 * POST /api/mcqs/  — create
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, mcqInputSchema } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'mcqs:read');
    const db = env(locals).DB;
    const where: string[] = [`m.status != 'deleted'`];
    const params: unknown[] = [];
    const status = url.searchParams.get('status');
    if (status) {
      where.push('m.status = ?');
      params.push(status);
    }
    const subjectId = url.searchParams.get('subjectId');
    if (subjectId && /^\d+$/.test(subjectId)) {
      where.push('m.subject_id = ?');
      params.push(Number(subjectId));
    }
    const q = url.searchParams.get('q');
    if (q) {
      where.push('(LOWER(m.question) LIKE ? OR LOWER(m.explanation) LIKE ?)');
      params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
    }
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const perPage = Math.min(100, Math.max(5, Number(url.searchParams.get('perPage')) || 20));
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const total = await db
      .prepare(`SELECT COUNT(*) AS n FROM mcqs m ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>();
    const rows = await db
      .prepare(
        `SELECT m.id, m.question, m.status, m.difficulty, m.subject_id, m.topic_id, m.article_id,
                m.updated_at, s.title AS subject, (SELECT COUNT(*) FROM mcq_options o WHERE o.mcq_id = m.id) AS option_count
         FROM mcqs m LEFT JOIN subjects s ON s.id = m.subject_id
         ${whereSql} ORDER BY m.updated_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, perPage, (page - 1) * perPage)
      .all<Record<string, unknown>>();
    return json({ rows: rows.results, total: total?.n ?? 0, page, perPage });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requirePermission(locals, 'mcqs:write');
    assertCsrf(locals);
    const input = await parseBody(request, mcqInputSchema);
    const correctCount = input.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new HttpError(400, 'Exactly one option must be marked correct.');
    }

    const db = env(locals).DB;
    const result = await db
      .prepare(
        `INSERT INTO mcqs (question, explanation, status, subject_id, topic_id, article_id, difficulty, tags_json, created_by)
         VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.question,
        input.explanation,
        input.subjectId ?? null,
        input.topicId ?? null,
        input.articleId ?? null,
        input.difficulty,
        JSON.stringify(input.tagNames),
        user.id,
      )
      .run();
    const id = result.meta?.last_row_id as number;

    await db
      .prepare(
        `INSERT INTO mcq_options (mcq_id, label, text, is_correct, sort_order) VALUES ${input.options
          .map(() => '(?, ?, ?, ?, ?)')
          .join(', ')}`,
      )
      .bind(...input.options.flatMap((o, i) => [id, o.label, o.text, o.isCorrect ? 1 : 0, i]))
      .run();

    await audit(locals, 'mcq.create', 'mcq', id, { question: input.question });
    return json({ id }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
