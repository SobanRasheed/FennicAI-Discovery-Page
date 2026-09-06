/**
 * AI image generation API. Generates an image with DashScope (qwen-image)
 * from a text prompt and stores it in the media library (R2 + D1) like any
 * other upload — so it is immediately usable as a thumbnail, icon, or inline
 * image everywhere media is picked.
 *
 * POST /api/media/generate/  (JSON: prompt, altText, title?, size?)
 *   size: 'landscape' (1664×928) | 'square' (1328×1328) | 'portrait' (928×1664)
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { ALLOWED_MEDIA_TYPES } from '../../../utils/validate';
import { audit } from '../../../utils/audit';
import { generateImage, IMAGE_SIZES } from '../../../utils/dashscope';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requirePermission(locals, 'media:write');
    assertCsrf(locals);

    const body = (await request.json()) as {
      prompt?: unknown;
      altText?: unknown;
      title?: unknown;
      size?: unknown;
    };
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const altText = typeof body.altText === 'string' ? body.altText.trim() : '';
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
    const size = typeof body.size === 'string' && body.size in IMAGE_SIZES
      ? (body.size as keyof typeof IMAGE_SIZES)
      : 'landscape';

    if (prompt.length < 10 || prompt.length > 2000) {
      throw new HttpError(422, 'Prompt must be between 10 and 2000 characters.');
    }
    if (altText.length < 5) {
      throw new HttpError(422, 'Meaningful alt text (at least 5 characters) is required for generated images.');
    }

    const { bytes, mime } = await generateImage(locals, prompt, size);

    const ext = ALLOWED_MEDIA_TYPES[mime];
    if (!ext) throw new HttpError(502, `DashScope returned an unsupported image type (${mime}).`);

    // R2 key: ai/<year>/<month>/<random>-<slug-from-prompt>.<ext>
    const slug =
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'generated';
    const now = new Date();
    const rand = crypto.getRandomValues(new Uint8Array(8));
    const randHex = [...rand].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = `ai/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randHex}-${slug}.${ext}`;
    const filename = `${slug}.${ext}`;

    await env(locals).MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });

    const result = await env(locals)
      .DB.prepare(
        `INSERT INTO media (r2_key, filename, mime_type, size_bytes, alt_text, title, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(key, filename, mime, bytes.byteLength, altText, title, user.id)
      .run();
    const id = result.meta?.last_row_id as number;
    await audit(locals, 'media.generate', 'media', id, { key, mime, size, prompt: prompt.slice(0, 200) });
    // Trailing slash required: the site uses `trailingSlash: 'always'`.
    return json({ id, key, url: `/media/${key}/`, altText }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
