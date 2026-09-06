/**
 * Single media item API.
 * GET    /api/media/:id/  — metadata (id, url, mime) for previews
 * PUT    /api/media/:id/  — alt text (required for images), title, caption
 * DELETE /api/media/:id/  — remove from R2 + D1
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, mediaUpdateSchema } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

async function loadMedia(locals: import('astro').App.Locals, id: number) {
  const row = await env(locals).DB.prepare(`SELECT * FROM media WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, 'Media not found.');
  return row;
}

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'media:read');
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid media id.');
    const media = await loadMedia(locals, Number(params.id));
    return json({
      id: media.id,
      r2_key: media.r2_key,
      url: `/media/${media.r2_key}/`,
      mime_type: media.mime_type,
      filename: media.filename,
    });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const PUT: APIRoute = async ({ request, locals, params }) => {
  try {
    requirePermission(locals, 'media:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid media id.');
    const media = await loadMedia(locals, id);

    const input = await parseBody(request, mediaUpdateSchema);
    const isImage = String(media.mime_type).startsWith('image/');
    if (isImage && String(media.mime_type) !== 'image/svg+xml' && input.altText.trim().length < 5) {
      throw new HttpError(422, 'Images require meaningful alt text (at least 5 characters).');
    }

    await env(locals)
      .DB.prepare(`UPDATE media SET alt_text = ?, title = ?, caption = ? WHERE id = ?`)
      .bind(input.altText, input.title ?? null, input.caption ?? null, id)
      .run();
    await audit(locals, 'media.update', 'media', id, { altText: input.altText });
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    requirePermission(locals, 'media:write');
    assertCsrf(locals);
    const id = Number(params.id);
    if (!/^\d+$/.test(String(params.id))) throw new HttpError(400, 'Invalid media id.');
    const media = await loadMedia(locals, id);

    // Block deletion while an article still uses the file.
    const usage = await env(locals)
      .DB.prepare(
        `SELECT COUNT(*) AS n FROM article_media am WHERE am.media_id = ?
         UNION ALL SELECT COUNT(*) FROM articles WHERE featured_media_id = ? OR og_image_media_id = ?`,
      )
      .bind(id, id, id)
      .all<{ n: number }>();
    if (usage.results.some((r) => r.n > 0)) {
      throw new HttpError(409, 'File is still referenced by articles; remove it from them first.');
    }

    await env(locals).MEDIA.delete(String(media.r2_key));
    await env(locals).DB.prepare(`DELETE FROM media WHERE id = ?`).bind(id).run();
    await audit(locals, 'media.delete', 'media', id, { key: media.r2_key });
    return json({ ok: true });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
