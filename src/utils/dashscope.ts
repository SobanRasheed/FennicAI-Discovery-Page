/**
 * Server-side DashScope (Alibaba Cloud) image generation.
 *
 * The API key lives in Worker secrets (.dev.vars locally, `wrangler secret
 * put DASHSCOPE_API_KEY` in production) and never reaches the browser. The
 * browser talks to /api/media/generate/, which calls this module.
 *
 * Model: qwen-image-2.0 via the multimodal-generation endpoint. The
 * prompt is extended server-side by DashScope (`prompt_extend: true`).
 */
import type { App } from 'astro';
import { env, HttpError } from './backend';

const API_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

/** Aspect presets mapped to DashScope `parameters.size` values. */
export const IMAGE_SIZES = {
  landscape: '1664*928', // thumbnails, hero art
  square: '1328*1328', // icons, spot illustrations
  portrait: '928*1664', // tall editorial art
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

export interface GeneratedImage {
  /** Raw image bytes downloaded from DashScope's temporary URL. */
  bytes: ArrayBuffer;
  mime: string;
  /** DashScope's temporary URL (expires quickly — bytes are what we keep). */
  sourceUrl: string;
}

/** Call DashScope and return the generated image bytes. */
export async function generateImage(
  locals: App.Locals,
  prompt: string,
  size: ImageSize = 'landscape',
): Promise<GeneratedImage> {
  const apiKey = env(locals).DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, 'DASHSCOPE_API_KEY is not configured (wrangler secret put DASHSCOPE_API_KEY).');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-image-2.0',
      input: {
        messages: [{ role: 'user', content: [{ text: prompt }] }],
      },
      parameters: { prompt_extend: true, size: IMAGE_SIZES[size] },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new HttpError(502, `DashScope request failed (${res.status}). ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    output?: { choices?: { message?: { content?: unknown } }[] };
  };
  const content = data.output?.choices?.[0]?.message?.content;

  // The image comes back either as a content item ({ image: url }) or as a
  // markdown string with the URL embedded, depending on model version.
  let sourceUrl: string | undefined;
  if (Array.isArray(content)) {
    sourceUrl = content.find((c): c is { image: string } => typeof c === 'object' && c !== null && 'image' in c)?.image;
  } else if (typeof content === 'string') {
    sourceUrl = content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp)\b/i)?.[0];
  }
  if (!sourceUrl) {
    throw new HttpError(502, 'DashScope returned no image URL.');
  }

  // DashScope URLs are short-lived — download now; R2 is the durable copy.
  const imgRes = await fetch(sourceUrl);
  if (!imgRes.ok) {
    throw new HttpError(502, `Downloading the generated image failed (${imgRes.status}).`);
  }
  const mime = imgRes.headers.get('content-type')?.split(';')[0] ?? 'image/png';
  if (!mime.startsWith('image/')) {
    throw new HttpError(502, `DashScope returned a non-image content type (${mime}).`);
  }
  return { bytes: await imgRes.arrayBuffer(), mime, sourceUrl };
}
