/**
 * Client-side image auto-adjust: downscale and re-encode oversized images in
 * the browser before they're uploaded, so a 12-megapixel phone photo doesn't
 * travel to R2 as 6 MB of bytes.
 *
 * Raster images (PNG/JPEG/WebP) larger than `maxEdge` on their longest side
 * are drawn onto a canvas at the target size and re-encoded as WebP (JPEG
 * fallback where the browser can't encode WebP). Files already within bounds
 * are returned unchanged; SVG, GIF, and PDF are never touched — SVG/GIF are
 * vector or animation formats where re-encoding loses information, and PDFs
 * aren't images at all.
 *
 * The server-side checks in /api/media/ (type allowlist, 25 MB cap, alt text)
 * remain the backstop: this is bandwidth polish, not validation.
 */

export interface ResizeOptions {
  /** Longest-edge cap in CSS pixels. */
  maxEdge?: number;
  /** Canvas encode quality for lossy output (0–1). */
  quality?: number;
}

const DEFAULTS: Required<ResizeOptions> = { maxEdge: 1920, quality: 0.85 };

/** Formats that must pass through untouched. */
const SKIP_TYPES = new Set(['image/svg+xml', 'image/gif', 'application/pdf']);

/** The best lossy format this browser can encode, checked once. */
let encodeType: string | null | undefined;
function bestEncodeType(): string | null {
  if (encodeType === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    encodeType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg';
  }
  return encodeType;
}

/**
 * Returns the file to upload: the original when it needs no adjustment (or
 * isn't an adjustable image), or a resized copy. Rejects only when the file
 * claims to be a raster image but can't be decoded.
 */
export async function resizeImageFile(
  file: File,
  options: ResizeOptions = {},
): Promise<File> {
  const { maxEdge, quality } = { ...DEFAULTS, ...options };
  const mime = file.type || '';

  if (SKIP_TYPES.has(mime) || !mime.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Undecodable "image": let the server's validation reject it properly.
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const needsResize = longest > maxEdge;
  const encodeAs = bestEncodeType();
  // Already small and already in an efficient format — nothing to do.
  if (!needsResize && (mime === 'image/webp' || mime === 'image/jpeg')) {
    bitmap.close();
    return file;
  }

  const scale = needsResize ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, encodeAs, quality),
  );
  if (!blob) return file;

  const ext = encodeAs === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.${ext}`, {
    type: encodeAs,
    lastModified: Date.now(),
  });
}
