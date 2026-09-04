/**
 * GET /api/articles/:id/revisions/ — revision history (restore + diff).
 */
import type { APIRoute } from 'astro';
import { json, jsonError, HttpError } from '../../../../utils/backend';
import { requirePermission } from '../../../../utils/auth';
import { env } from '../../../../utils/backend';

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'articles:read');
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid article id.');
    const rows = await env(locals)
      .DB.prepare(
        `SELECT r.id, r.note, r.created_at, u.display_name AS author
         FROM revisions r LEFT JOIN users u ON u.id = r.created_by
         WHERE r.article_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 100`,
      )
      .bind(id)
      .all<{ id: number; note: string; created_at: string; author: string | null }>();
    return json({ revisions: rows.results });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
