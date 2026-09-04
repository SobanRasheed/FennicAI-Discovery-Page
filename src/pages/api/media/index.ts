/**
 * Media library API (§9). Files stream straight to R2; D1 keeps only
 * metadata. Alt text is REQUIRED for images before they can be inserted.
 *
 * GET    /api/media/           — list/search
 * POST   /api/media/           — upload (multipart/form-data: file, altText?)
 * PUT    /api/media/:id/       — set alt text / title / caption
 * DELETE /api/media/:id/       — delete from R2 + D1
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, mediaUpdateSchema } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'media:read');
    const db = env(locals).DB;
    const q = url.searchParams.get('q');
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const perPage = Math.min(100, Math.max(5, Number(url.searchParams.get('perPage')) || 30));
    const where = q ? `WHERE (filename LIKE ? OR alt_text LIKE ?)` : '';
    const params = q ? [`%${q}%`, `%${q}%`] : [];
    const total = await db
      .prepare(`SELECT COUNT(*) AS n FROM media ${where}`)
      .bind(...params)
      .first<{ n: number }>();
    const rows = await db
      .prepare(`SELECT * FROM media ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(...params, perPage, (page - 1) * perPage)
      .all<Record<string, unknown>>();
    return json({ media: rows.results, total: total?.n ?? 0, page, perPage });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requirePermission(locals, 'media:write');
    assertCsrf(locals);
    const form = await request.formData();
    const file = form.get('file');
    const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim() : '';
    const title = typeof form.get('title') === 'string' ? String(form.get('title')).trim() : null;
    if (!(file instanceof File)) throw new HttpError(400, 'file is required (multipart/form-data).');

    const mime = file.type || 'application/octet-stream';
    const ext = ALLOWED_MEDIA_TYPES[mime];
    if (!ext) throw new HttpError(415, `Unsupported media type: ${mime}. Allowed: PNG, JPEG, GIF, WebP, SVG, PDF.`);
    if (file.size > MAX_MEDIA_BYTES) {
      throw new HttpError(413, `File too large (max ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB).`);
    }
    if (mime.startsWith('image/') && mime !== 'image/svg+xml' && altText.length < 5) {
      throw new HttpError(422, 'Meaningful alt text (at least 5 characters) is required for images.');
    }

    // R2 key: 2026/09/<random>-<safe-filename>.<ext>
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `upload.${ext}`;
    const now = new Date();
    const rand = crypto.getRandomValues(new Uint8Array(8));
    const randHex = [...rand].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randHex}-${safeName}`;

    const bucket = env(locals).MEDIA;
    await bucket.put(key, file.stream(), { httpMetadata: { contentType: mime } });

    const result = await env(locals)
      .DB.prepare(
        `INSERT INTO media (r2_key, filename, mime_type, size_bytes, alt_text, title, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(key, file.name, mime, file.size, altText, title, user.id)
      .run();
    const id = result.meta?.last_row_id as number;
    await audit(locals, 'media.upload', 'media', id, { key, mime, size: file.size });
    // Trailing slash required: the site uses `trailingSlash: 'always'`, and a
    // slashless media URL 404s instead of redirecting.
    return json({ id, key, url: `/media/${key}/`, altText }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
