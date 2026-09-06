/**
 * Client script for the Google Form quiz admin form: thumbnail pick/upload
 * with a live preview. Mirrors the article editor's featured-image UX.
 */
import { pickMedia, uploadMediaFile } from './media-client';

export function initQuizFormMedia(): void {
  // The token is embedded as a JSON-quoted string in a script tag.
  const csrfEl = document.getElementById('csrf-token');
  const csrf = csrfEl ? (JSON.parse(csrfEl.textContent || '""') as string) : '';
  const input = document.querySelector('[name="mediaId"]') as HTMLInputElement | null;
  const preview = document.getElementById('thumb-preview');
  const img = preview?.querySelector('img') ?? null;
  if (!input || !preview) return;

  let seq = 0;
  const refresh = async () => {
    const id = input.value.trim();
    const mine = ++seq;
    if (!/^\d+$/.test(id)) {
      preview.hidden = true;
      return;
    }
    const res = await fetch(`/api/media/${id}/`, { headers: { 'X-CSRF-Token': csrf } });
    const data = res.ok ? (await res.json() as { url?: string; mime_type?: string; filename?: string }) : {};
    if (mine !== seq) return; // a newer change already superseded this fetch
    if (data.url && data.mime_type?.startsWith('image/')) {
      img!.src = data.url;
      img!.title = data.filename ?? '';
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }
  };
  input.addEventListener('input', refresh);
  refresh();

  const setMedia = (m: { id: number }) => {
    input.value = String(m.id);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  document.querySelector('.btn-pick-thumb')?.addEventListener('click', async () => {
    const m = await pickMedia(csrf);
    if (m) setMedia(m);
  });

  document.querySelector('.btn-upload-thumb')?.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      const alt = window.prompt(
        `Alt text for "${f.name}" (required, describes the image for screen readers):`,
        f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '),
      );
      if (alt === null) return;
      if (alt.trim().length < 5) {
        window.alert('Meaningful alt text (5+ characters) is required for images.');
        return;
      }
      try {
        setMedia(await uploadMediaFile(csrf, f, alt.trim()));
      } catch (err) {
        window.alert((err as Error).message);
      }
    });
    fileInput.click();
  });
}
