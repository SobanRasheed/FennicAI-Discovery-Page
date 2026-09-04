/**
 * POST /admin/media/:id/save/ — no-JS alt text / title / caption update.
 * Images still require meaningful alt text (≥ 5 characters).
 */
import { env } from '../../../../utils/backend';
import { audit } from '../../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ params, request, locals, redirect }) => {
  const id = Number(params.id);
  if (!/^\d+$/.test(String(params.id))) return redirect('/admin/media/', 303);
  const back = (msg: string) =>
    redirect(`/admin/media/${id}/?error=${encodeURIComponent(msg)}`, 303);

  const db = env(locals).DB;
  const media = await db.prepare(`SELECT * FROM media WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!media) return redirect('/admin/media/', 303);

  const form = await request.formData();
  const altText = String(form.get('altText') ?? '').trim().slice(0, 500);
  const title = String(form.get('title') ?? '').trim().slice(0, 200) || null;
  const caption = String(form.get('caption') ?? '').trim().slice(0, 600) || null;

  const isImage = String(media.mime_type).startsWith('image/');
  if (isImage && media.mime_type !== 'image/svg+xml' && altText.length < 5) {
    return back('Images require meaningful alt text (at least 5 characters).');
  }

  await db.prepare(`UPDATE media SET alt_text = ?, title = ?, caption = ? WHERE id = ?`).bind(altText, title, caption, id).run();
  await audit(locals, 'media.update', 'media', id, { altText });
  return redirect('/admin/media/', 303);
};
