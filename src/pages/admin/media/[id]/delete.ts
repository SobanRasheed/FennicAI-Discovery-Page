/**
 * POST /admin/media/:id/delete/ — remove a media file from R2 + D1
 * (blocked while articles reference it, matching the API rule).
 */
import { env } from '../../../../utils/backend';
import { audit } from '../../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ params, locals, redirect }) => {
  const id = Number(params.id);
  if (!/^\d+$/.test(String(params.id))) return redirect('/admin/media/', 303);
  const back = (msg: string) =>
    redirect(`/admin/media/${id}/?error=${encodeURIComponent(msg)}`, 303);

  const db = env(locals).DB;
  const media = await db.prepare(`SELECT * FROM media WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!media) return redirect('/admin/media/', 303);

  const usage = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM article_media am WHERE am.media_id = ?
       UNION ALL SELECT COUNT(*) FROM articles WHERE featured_media_id = ? OR og_image_media_id = ?`,
    )
    .bind(id, id, id)
    .all<{ n: number }>();
  if (usage.results.some((r) => r.n > 0)) {
    return back('File is still referenced by articles; remove it from them first.');
  }

  await env(locals).MEDIA.delete(String(media.r2_key));
  await db.prepare(`DELETE FROM media WHERE id = ?`).bind(id).run();
  await audit(locals, 'media.delete', 'media', id, { key: media.r2_key });
  return redirect('/admin/media/', 303);
};
