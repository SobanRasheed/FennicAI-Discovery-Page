/**
 * POST /admin/quiz-forms/save/ — no-JS Google Form quiz save handler.
 * Validates that the form URL really points at Google Forms so the practice
 * pages can't be turned into a redirect to arbitrary sites.
 */
import { env } from '../../../utils/backend';
import { audit } from '../../../utils/audit';

export const prerender = false;

/** Only Google Forms hosts — students are redirected here from our pages. */
function isGoogleFormUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return host === 'docs.google.com' || host === 'forms.gle';
}

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  try {
    if (!locals.user) return redirect('/admin/login/', 303);
    const form = await request.formData();
    const idRaw = String(form.get('id') ?? '');
    const id = /^\d+$/.test(idRaw) ? Number(idRaw) : null;
    const back = `/admin/quiz-forms/${id ? `${id}/` : 'new/'}`;
    const fail = (msg: string) => redirect(`${back}?error=${encodeURIComponent(msg)}`, 303);

    if (form.get('delete')) {
      if (!id) return fail('Nothing to delete.');
      const db = env(locals).DB;
      await db.prepare(`DELETE FROM quiz_forms WHERE id = ?`).bind(id).run();
      await audit(locals, 'quiz_form.delete', 'quiz_form', id, {});
      return redirect('/admin/quiz-forms/', 303);
    }

    const title = String(form.get('title') ?? '').trim();
    const topic = String(form.get('topic') ?? '').trim() || null;
    const googleFormUrl = String(form.get('googleFormUrl') ?? '').trim();
    const subjectId = /^\d+$/.test(String(form.get('subjectId') ?? '')) ? Number(form.get('subjectId')) : null;
    const mediaId = /^\d+$/.test(String(form.get('mediaId') ?? '')) ? Number(form.get('mediaId')) : null;

    if (!title) return fail('Title is required.');
    if (title.length > 200) return fail('Title must be 200 characters or fewer.');
    if (topic && topic.length > 200) return fail('Topic must be 200 characters or fewer.');
    if (!googleFormUrl) return fail('Google Form URL is required.');
    if (!isGoogleFormUrl(googleFormUrl)) {
      return fail('The URL must be an https://docs.google.com/forms/… or https://forms.gle/… link.');
    }

    const db = env(locals).DB;

    let formId = id;
    if (id) {
      await db
        .prepare(
          `UPDATE quiz_forms SET title = ?, topic = ?, subject_id = ?, google_form_url = ?, media_id = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(title, topic, subjectId, googleFormUrl, mediaId, id)
        .run();
    } else {
      const result = await db
        .prepare(
          `INSERT INTO quiz_forms (title, topic, subject_id, google_form_url, media_id, status)
           VALUES (?, ?, ?, ?, ?, 'unpublished')`,
        )
        .bind(title, topic, subjectId, googleFormUrl, mediaId)
        .run();
      formId = result.meta?.last_row_id as number;
    }

    if (form.get('publish')) {
      await db.prepare(`UPDATE quiz_forms SET status = 'published', updated_at = datetime('now') WHERE id = ?`).bind(formId).run();
    } else if (form.get('unpublish')) {
      await db.prepare(`UPDATE quiz_forms SET status = 'unpublished', updated_at = datetime('now') WHERE id = ?`).bind(formId).run();
    }

    await audit(locals, id ? 'quiz_form.update' : 'quiz_form.create', 'quiz_form', formId, { title });
    return redirect(`/admin/quiz-forms/${formId}/`, 303);
  } catch (err) {
    const message = encodeURIComponent((err as Error).message || 'Save failed.');
    return redirect(`/admin/quiz-forms/?error=${message}`, 303);
  }
};
