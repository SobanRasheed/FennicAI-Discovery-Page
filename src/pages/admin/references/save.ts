/**
 * POST /admin/references/save/ — no-JS reference creation (§10),
 * server-validated with the same rules as the API.
 */
import { env } from '../../../utils/backend';
import { audit } from '../../../utils/audit';

export const prerender = false;

const REF_TYPES = new Set(['textbook', 'journal', 'guideline', 'organization', 'educational']);
const YEAR_RE = /^\d{4}$/;
const URL_RE = /^https?:\/\//i;

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  const back = (msg: string) =>
    redirect(`/admin/references/?error=${encodeURIComponent(msg)}`, 303);
  try {
    if (!locals.user) return redirect('/admin/login/', 303);
    const form = await request.formData();

    const refType = String(form.get('refType') ?? 'textbook');
    if (!REF_TYPES.has(refType)) return back('Invalid reference type.');

    const title = String(form.get('title') ?? '').trim().slice(0, 400);
    if (!title) return back('Title is required.');

    const authors = String(form.get('authors') ?? '').trim().slice(0, 400);
    const source = String(form.get('source') ?? '').trim().slice(0, 200);
    const yearRaw = String(form.get('year') ?? '').trim();
    const year = YEAR_RE.test(yearRaw) ? yearRaw : null;
    const edition = String(form.get('edition') ?? '').trim().slice(0, 50);
    const urlRaw = String(form.get('url') ?? '').trim();
    const url = urlRaw && URL_RE.test(urlRaw) ? urlRaw : null;
    const doi = String(form.get('doi') ?? '').trim().slice(0, 100);
    const accessedAt = String(form.get('accessedAt') ?? '').trim().slice(0, 30);
    const notes = String(form.get('notes') ?? '').trim().slice(0, 1000);

    const result = await env(locals)
      .DB.prepare(
        `INSERT INTO "references" (ref_type, title, authors, source, year, edition, url, doi, accessed_at, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(refType, title, authors, source, year, edition, url, doi, accessedAt, notes, locals.user.id)
      .run();
    const id = result.meta?.last_row_id as number;
    await audit(locals, 'reference.create', 'reference', id, { title });
    return redirect(`/admin/references/?created=${id}`, 303);
  } catch (err) {
    return back((err as Error).message || 'Save failed.');
  }
};
