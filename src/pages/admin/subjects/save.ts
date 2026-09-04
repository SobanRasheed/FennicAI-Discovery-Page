/**
 * POST /admin/subjects/save/ — no-JS subject save (§5), server-validated.
 */
import { env } from '../../../utils/backend';
import { audit } from '../../../utils/audit';

export const prerender = false;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  const back = (msg: string, id?: number) =>
    redirect(`/admin/subjects/${id ? `${id}/` : 'new/'}?error=${encodeURIComponent(msg)}`, 303);
  try {
    if (!locals.user) return redirect('/admin/login/', 303);
    const form = await request.formData();
    const idRaw = String(form.get('id') ?? '');
    const id = /^\d+$/.test(idRaw) ? Number(idRaw) : null;

    const title = String(form.get('title') ?? '').trim();
    const slug = String(form.get('slug') ?? '').trim();
    if (!title || !SLUG_RE.test(slug)) return back('Title and a valid slug are required.', id ?? undefined);

    const db = env(locals).DB;
    const dupe = await db
      .prepare(`SELECT id FROM subjects WHERE slug = ?${id ? ' AND id != ?' : ''}`)
      .bind(...(id ? [slug, id] : [slug]))
      .first<{ id: number }>();
    if (dupe) return back('A subject with this slug already exists.', id ?? undefined);

    const values = {
      title,
      slug,
      description: String(form.get('description') ?? '').slice(0, 400),
      introduction: String(form.get('introduction') ?? '').slice(0, 4000),
      imageMediaId: /^\d+$/.test(String(form.get('imageMediaId') ?? '')) ? Number(form.get('imageMediaId')) : null,
      seoTitle: String(form.get('seoTitle') ?? '') || null,
      seoDescription: String(form.get('seoDescription') ?? '') || null,
      sortOrder: Math.min(9999, Math.max(0, Number(form.get('sortOrder')) || 0)),
      isActive: form.get('isActive') ? 1 : 0,
    };

    if (id) {
      await db
        .prepare(
          `UPDATE subjects SET title = ?, slug = ?, description = ?, introduction = ?, image_media_id = ?,
                            seo_title = ?, seo_description = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
           WHERE id = ?`,
        )
        .bind(values.title, values.slug, values.description, values.introduction, values.imageMediaId,
              values.seoTitle, values.seoDescription, values.sortOrder, values.isActive, id)
        .run();
      await audit(locals, 'subject.update', 'subject', id, { title });
      return redirect('/admin/subjects/', 303);
    }

    const result = await db
      .prepare(
        `INSERT INTO subjects (title, slug, description, introduction, image_media_id, seo_title, seo_description, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(values.title, values.slug, values.description, values.introduction, values.imageMediaId,
            values.seoTitle, values.seoDescription, values.sortOrder, values.isActive)
      .run();
    await audit(locals, 'subject.create', 'subject', result.meta?.last_row_id as number, { title });
    return redirect('/admin/subjects/', 303);
  } catch (err) {
    return back((err as Error).message || 'Save failed.');
  }
};
