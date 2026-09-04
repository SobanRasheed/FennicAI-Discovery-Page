/**
 * POST /admin/media/upload/ — no-JS media upload (§9). Streams the file to
 * R2, keeps only metadata in D1, enforces the same rules as the API:
 * type allowlist, 25 MB cap, meaningful alt text for images.
 */
import { env, HttpError } from '../../../utils/backend';
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  const back = (msg: string) =>
    redirect(`/admin/media/?error=${encodeURIComponent(msg)}`, 303);
  try {
    if (!locals.user) return redirect('/admin/login/', 303);
    const form = await request.formData();
    const file = form.get('file');
    const altText = String(form.get('altText') ?? '').trim();
    const title = String(form.get('title') ?? '').trim() || null;
    if (!(file instanceof File)) return back('Choose a file to upload.');

    const mime = file.type || 'application/octet-stream';
    const ext = ALLOWED_MEDIA_TYPES[mime];
    if (!ext) return back('Unsupported file type. Allowed: PNG, JPEG, GIF, WebP, SVG, PDF.');
    if (file.size > MAX_MEDIA_BYTES) {
      return back(`File too large (max ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB).`);
    }
    if (mime.startsWith('image/') && mime !== 'image/svg+xml' && altText.length < 5) {
      return back('Images require meaningful alt text (at least 5 characters).');
    }

    const safeName =
      file.name
        .toLowerCase()
        .replace(/[^a-z0-9.\-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || `upload.${ext}`;
    const now = new Date();
    const rand = crypto.getRandomValues(new Uint8Array(8));
    const randHex = [...rand].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randHex}-${safeName}`;

    await env(locals).MEDIA.put(key, file.stream(), { httpMetadata: { contentType: mime } });
    const result = await env(locals)
      .DB.prepare(
        `INSERT INTO media (r2_key, filename, mime_type, size_bytes, alt_text, title, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(key, file.name, mime, file.size, altText, title, locals.user.id)
      .run();
    await audit(locals, 'media.upload', 'media', result.meta?.last_row_id as number, {
      key,
      mime,
      size: file.size,
    });
    return redirect('/admin/media/', 303);
  } catch (err) {
    return back((err as HttpError).message || (err as Error).message || 'Upload failed.');
  }
};
