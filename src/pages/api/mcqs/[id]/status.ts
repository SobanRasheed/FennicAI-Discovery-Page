/**
 * POST /api/mcqs/:id/status/ — { status: 'draft' | 'published' | 'unpublished' }
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../../utils/auth';
import { mcqStatusSchema } from '../../../../utils/validate';
import { audit } from '../../../../utils/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    requirePermission(locals, 'mcqs:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid MCQ id.');

    const body = await request.json().catch(() => null);
    const parsed = mcqStatusSchema.safeParse(body?.status);
    if (!parsed.success || parsed.data === 'deleted') {
      throw new HttpError(400, 'status must be draft, published, or unpublished.');
    }
    const mcq = await env(locals).DB.prepare(`SELECT question FROM mcqs WHERE id = ?`).bind(id).first<{ question: string }>();
    if (!mcq) throw new HttpError(404, 'MCQ not found.');

    // Publishing requires an explanation (educational value, §8).
    if (parsed.data === 'published') {
      const row = await env(locals).DB.prepare(`SELECT explanation FROM mcqs WHERE id = ?`).bind(id).first<{ explanation: string }>();
      if (!row?.explanation?.trim()) {
        throw new HttpError(422, 'Cannot publish an MCQ without an explanation.');
      }
    }

    await env(locals)
      .DB.prepare(`UPDATE mcqs SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(parsed.data, id)
      .run();
    await audit(locals, `mcq.${parsed.data}`, 'mcq', id, { question: mcq.question });
    return json({ ok: true, status: parsed.data });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
