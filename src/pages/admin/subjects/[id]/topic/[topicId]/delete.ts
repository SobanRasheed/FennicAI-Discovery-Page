/**
 * POST /admin/subjects/:id/topic/:topicId/delete/ — delete a topic
 * (blocked while articles reference it, matching the API rule).
 */
import { env } from '../../../../../../utils/backend';
import { audit } from '../../../../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ params, locals, redirect }) => {
  const subjectId = Number(params.id);
  const topicId = Number(params.topicId);
  if (!/^\d+$/.test(String(params.id)) || !/^\d+$/.test(String(params.topicId))) {
    return redirect('/admin/subjects/', 303);
  }
  const inUse = await env(locals)
    .DB.prepare(`SELECT COUNT(*) AS n FROM articles WHERE topic_id = ? AND status != 'deleted'`)
    .bind(topicId)
    .first<{ n: number }>();
  if ((inUse?.n ?? 0) > 0) {
    return redirect(`/admin/subjects/?error=${encodeURIComponent('Topic has articles attached; move them first.')}`, 303);
  }
  await env(locals).DB.prepare(`DELETE FROM topics WHERE id = ?`).bind(topicId).run();
  await audit(locals, 'topic.delete', 'topic', topicId, { subjectId });
  return redirect('/admin/subjects/', 303);
};
