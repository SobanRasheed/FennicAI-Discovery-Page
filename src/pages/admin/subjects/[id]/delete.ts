/**
 * POST /admin/subjects/:id/delete/ — deactivate a subject (blocked while
 * articles reference it, matching the API rule).
 */
import { env } from '../../../../utils/backend';
import { audit } from '../../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ params, locals, redirect }) => {
  const id = Number(params.id);
  if (!/^\d+$/.test(String(params.id))) return redirect('/admin/subjects/', 303);
  const inUse = await env(locals)
    .DB.prepare(`SELECT COUNT(*) AS n FROM articles WHERE subject_id = ? AND status != 'deleted'`)
    .bind(id)
    .first<{ n: number }>();
  if ((inUse?.n ?? 0) > 0) {
    return redirect(`/admin/subjects/?error=${encodeURIComponent('Subject has articles attached; move or delete them first.')}`, 303);
  }
  await env(locals).DB.prepare(`UPDATE subjects SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(id).run();
  await audit(locals, 'subject.delete', 'subject', id, {});
  return redirect('/admin/subjects/', 303);
};
