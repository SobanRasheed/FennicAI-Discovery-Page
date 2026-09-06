/**
 * Shared client-side media helpers for the admin portal (§12).
 *
 * Used by the article editor (src/components/admin-editor.ts), the article
 * sidebar's direct Upload buttons, and the Google Form quiz admin pages.
 *
 * Responsibilities:
 * - uploadMediaFile: resize (client-side auto-adjust) + POST to /api/media/
 * - pickMedia: the media-library dialog (search existing or upload new)
 */

import { resizeImageFile } from './image-resize';

export interface PickedMedia { id: number; url: string; alt: string }

interface MediaItem { id: number; r2_key: string; filename: string; mime_type: string; alt_text: string }

/**
 * Upload one file to the media library via /api/media/, auto-adjusting
 * raster images first. Returns the new media row's id + public URL.
 */
export async function uploadMediaFile(csrf: string, file: File, altText: string): Promise<PickedMedia> {
  const body = new FormData();
  body.set('file', await resizeImageFile(file));
  body.set('altText', altText);
  const res = await fetch('/api/media/', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body });
  const data = await res.json() as { id?: number; url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
  return { id: data.id!, url: data.url!, alt: altText };
}

/**
 * Media-library dialog: pick an existing image (searchable list) or upload a
 * new file. Resolves with the picked media, or null when cancelled.
 */
export function pickMedia(csrf: string): Promise<PickedMedia | null> {
  return new Promise((resolve) => {
    const dlg = document.createElement('div');
    dlg.className = 'msn-dialog media-picker';
    const h = document.createElement('h3');
    h.textContent = 'Media library';
    dlg.appendChild(h);

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search files';
    dlg.appendChild(search);
    const list = document.createElement('div');
    list.className = 'media-list';
    dlg.appendChild(list);

    const upLabel = document.createElement('label');
    upLabel.textContent = 'Upload new file';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf';
    upLabel.appendChild(file);
    const alt = document.createElement('input');
    alt.type = 'text';
    alt.placeholder = 'Alt text (required for images)';
    dlg.append(upLabel, alt);
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload';
    uploadBtn.className = 'btn btn-primary';
    const err = document.createElement('p');
    err.className = 'msn-dialog-error';
    uploadBtn.addEventListener('click', async () => {
      const f = file.files?.[0];
      if (!f) return;
      if (f.type.startsWith('image/') && alt.value.trim().length < 5) {
        err.textContent = 'Meaningful alt text (5+ characters) is required for images.';
        return;
      }
      try {
        const m = await uploadMediaFile(csrf, f, alt.value.trim());
        resolve(m);
        dlg.remove();
      } catch (e) {
        err.textContent = (e as Error).message;
      }
    });
    dlg.append(err, uploadBtn);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.className = 'btn';
    cancel.addEventListener('click', () => {
      resolve(null);
      dlg.remove();
    });
    dlg.appendChild(cancel);
    document.body.appendChild(dlg);

    const render = async (q: string) => {
      const res = await fetch(`/api/media/?perPage=30${q ? `&q=${encodeURIComponent(q)}` : ''}`, { headers: { 'X-CSRF-Token': csrf } });
      if (!res.ok) return;
      const data = await res.json() as { media: MediaItem[] };
      list.innerHTML = '';
      for (const m of data.media.filter((x) => x.mime_type.startsWith('image/'))) {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = `${m.filename}${m.alt_text ? ` — "${m.alt_text}"` : ' — no alt text'}`;
        item.className = 'media-item';
        item.addEventListener('click', () => {
          resolve({ id: m.id, url: `/media/${m.r2_key}/`, alt: m.alt_text });
          dlg.remove();
        });
        list.appendChild(item);
      }
      if (!data.media.length) {
        const none = document.createElement('p');
        none.textContent = 'No media yet. Upload a file below.';
        list.appendChild(none);
      }
    };
    search.addEventListener('input', () => render(search.value));
    render('');
  });
}
