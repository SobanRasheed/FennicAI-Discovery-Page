/**
 * POST /admin/articles/create/ — no-JS form handler for new drafts. Uses
 * the same validation rules as the REST API (server-side, §14).
 */
import { env, HttpError } from '../../../utils/backend';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  try {
    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const slug = String(form.get('slug') ?? '').trim();
    const articleType = String(form.get('articleType') ?? 'article') === 'study-note' ? 'study-note' : 'article';
    const excerpt = String(form.get('excerpt') ?? '').trim().slice(0, 400);
    const subjectId = /^\d+$/.test(String(form.get('subjectId') ?? '')) ? Number(form.get('subjectId')) : null;
    const topicId = /^\d+$/.test(String(form.get('topicId') ?? '')) ? Number(form.get('topicId')) : null;
    const categoryRaw = String(form.get('category') ?? '');
    const category =
      articleType === 'article' && ['study-techniques', 'exam-preparation', 'subject-guides'].includes(categoryRaw)
        ? categoryRaw
        : null;
    const user = locals.user!;

    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return redirect('/admin/articles/new/?error=Title+and+valid+slug+required.', 303);
    }

    const db = env(locals).DB;
    const collision = await db
      .prepare(`SELECT id FROM articles WHERE subject_id IS ? AND slug = ? AND status != 'deleted'`)
      .bind(subjectId, slug)
      .first<{ id: number }>();
    if (collision) {
      return redirect(`/admin/articles/new/?error=${encodeURIComponent('Slug already exists under that subject.')}`, 303);
    }

    const result = await db
      .prepare(
        `INSERT INTO articles (title, slug, excerpt, article_type, category, status, subject_id, topic_id, author_id, reading_minutes)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, 1)`,
      )
      .bind(title, slug, excerpt, articleType, category, subjectId, topicId, user.id)
      .run();
    const id = result.meta?.last_row_id as number;
    await audit(locals, 'article.create', 'article', id, { title });

    return redirect(`/admin/articles/${id}/`, 303);
  } catch (err) {
    const message = encodeURIComponent((err as Error).message || 'Create failed.');
    return redirect(`/admin/articles/new/?error=${message}`, 303);
  }
};
