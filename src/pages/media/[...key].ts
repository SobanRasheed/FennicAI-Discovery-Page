/**
 * /media/[...key] (§9) — R2 proxy for uploaded media. Files live in the
 * MEDIA bucket; this streams them publicly with immutable caching (keys are
 * random + content-addressed by URL, so they never change).
 */
import type { APIRoute } from 'astro';
import { env } from '../../utils/backend';

export const prerender = false;

const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']);

export const GET: APIRoute = async ({ params, locals }) => {
  const key = String(params.key ?? '').replace(/^\/+|\/+$/g, '');
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  // Metadata lookup: only serve files registered in D1 (and check the R2
  // object actually exists).
  const media = await env(locals)
    .DB.prepare(`SELECT mime_type FROM media WHERE r2_key = ?`)
    .bind(key)
    .first<{ mime_type: string }>();
  if (!media) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env(locals).MEDIA.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers: Record<string, string> = {
    'Content-Type': object.httpMetadata?.contentType || media.mime_type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': object.httpEtag.replace(/^"|"$/g, ''),
  };
  // PDFs download rather than render inline; images inline.
  if (!INLINE_TYPES.has(headers['Content-Type'])) {
    headers['Content-Disposition'] = 'attachment';
  }

  return new Response(object.body, { headers });
};
