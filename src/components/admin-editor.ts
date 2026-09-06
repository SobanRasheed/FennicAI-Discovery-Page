/**
 * Admin article editor client script (§3, §4, §7, §11). Loaded by
 * /admin/articles/[id]/.astro as a bundled <script>.
 *
 * Responsibilities:
 * - Boot the Tiptap editor with the medical custom blocks
 * - Toolbar commands (formatting, medical blocks, links, images, tables)
 * - Debounced autosave (PUT /api/articles/:id/) + manual save + Cmd/Ctrl+S
 * - Status transitions (review/publish/unpublish/schedule) with the
 *   publishing-checklist failure UI
 * - Internal-link search + related-content suggestions
 * - Media picker dialog (upload to R2 via /api/media, or pick existing)
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import {
  Definition,
  KeyPoint,
  ClinicalPearl,
  Important,
  Warning,
  McqBlock,
  ReferencesBlock,
  Underline,
} from '../utils/editor-blocks';

interface McqAttrs {
  question: string;
  options: { text: string; correct: boolean }[];
  answer: string;
  explanation: string;
}

const encodeMcq = (a: McqAttrs) => JSON.stringify([a.question, a.options, a.answer, a.explanation]);

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const field = (name: string) => document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
const val = (name: string) => (field(name) as { value?: string } | null)?.value ?? '';

export function initEditor(articleId: number): void {
  const dataEl = document.getElementById('article-data');
  const csrf = (document.getElementById('csrf-token') as HTMLTextAreaElement)?.value ?? '';
  const article = dataEl ? (JSON.parse(dataEl.textContent || '{}') as Record<string, unknown>) : {};
  const subjects = dataEl ? ((article.subjects as { id: number; title: string; topics: { id: number; title: string }[] }[]) ?? []) : [];

  const editor = new Editor({
    element: document.querySelector('.editor-area')!,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: 'Start writing the study note…' }),
      TableKit.configure({ table: { resizable: false } }),
      Definition,
      KeyPoint,
      ClinicalPearl,
      Important,
      Warning,
      McqBlock,
      ReferencesBlock,
    ],
    content: (article.content_json as object) || { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: () => scheduleSave(),
  });

  // -------------------------------------------------------------------------
  // Toolbar
  // -------------------------------------------------------------------------
  type BtnSpec = [string, string, () => void]; // [label, title, command]

  const containerBlocks: [string, string, () => void][] = [
    ['Def', 'Insert definition block', () => editor.chain().focus().toggleWrap('definition').run()],
    ['Key', 'Insert key point', () => editor.chain().focus().toggleWrap('keyPoint').run()],
    ['Pearl', 'Insert clinical pearl', () => editor.chain().focus().toggleWrap('clinicalPearl').run()],
    ['Imp', 'Insert important (exam-relevant) block', () => editor.chain().focus().toggleWrap('important').run()],
    ['Warn', 'Insert warning block', () => editor.chain().focus().toggleWrap('warning').run()],
    ['MCQ', 'Insert practice question block', insertMcq],
    ['Refs', 'Insert references block', insertReferences],
  ];

  const buttons: BtnSpec[] = [
    ['B', 'Bold (Mod-B)', () => editor.chain().focus().toggleBold().run()],
    ['I', 'Italic (Mod-I)', () => editor.chain().focus().toggleItalic().run()],
    ['U', 'Underline', () => editor.chain().focus().toggleUnderline().run()],
    ['S', 'Strikethrough', () => editor.chain().focus().toggleStrike().run()],
    ['H1', 'Heading 1', () => editor.chain().focus().toggleHeading({ level: 1 }).run()],
    ['H2', 'Heading 2', () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
    ['H3', 'Heading 3', () => editor.chain().focus().toggleHeading({ level: 3 }).run()],
    ['H4', 'Heading 4', () => editor.chain().focus().toggleHeading({ level: 4 }).run()],
    ['P', 'Paragraph', () => editor.chain().focus().setParagraph().run()],
    ['• List', 'Bullet list', () => editor.chain().focus().toggleBulletList().run()],
    ['1. List', 'Numbered list', () => editor.chain().focus().toggleOrderedList().run()],
    ['❝', 'Blockquote', () => editor.chain().focus().toggleBlockquote().run()],
    ['―', 'Horizontal rule', () => editor.chain().focus().setHorizontalRule().run()],
    ['🔗', 'Insert link', insertLink],
    ['🖼', 'Insert image from media library', () => pickMedia().then((m) => m && insertImage(m.url, m.alt))],
    ['⊞', 'Insert table', () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()],
    ['x₂', 'Subscript', () => editor.chain().focus().toggleSubscript().run()],
    ['x²', 'Superscript', () => editor.chain().focus().toggleSuperscript().run()],
    ['⬅', 'Undo (Mod-Z)', () => editor.chain().focus().undo().run()],
    ['➡', 'Redo (Mod-Y)', () => editor.chain().focus().redo().run()],
    ['Left', 'Align left', () => editor.chain().focus().setTextAlign('left').run()],
    ['Center', 'Align center', () => editor.chain().focus().setTextAlign('center').run()],
    ['Right', 'Align right', () => editor.chain().focus().setTextAlign('right').run()],
  ];

  const toolbar = $('.editor-toolbar')!;
  for (const [label, title, command] of buttons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      command();
    });
    toolbar.appendChild(b);
  }
  const sep = document.createElement('span');
  sep.className = 'toolbar-sep';
  toolbar.appendChild(sep);
  for (const [label, title, command] of containerBlocks) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.className = 'med-btn';
    b.addEventListener('click', (e) => {
      e.preventDefault();
      command();
    });
    toolbar.appendChild(b);
  }

  function insertLink(): void {
    const url = window.prompt('Link URL (https://… or /subject/slug/)');
    if (!url) return;
    if (editor.state.selection.empty) {
      const text = window.prompt('Link text') ?? url;
      editor.chain().focus().insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href: url } }] }).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function insertImage(url: string, alt: string): void {
    editor.chain().focus().setImage({ src: url, alt }).run();
  }

  // -------------------------------------------------------------------------
  // Medical block dialogs (plain DOM)
  // -------------------------------------------------------------------------

  function insertMcq(): void {
    const dlg = dialog('Insert practice question');
    const question = textarea(dlg, 'Question');
    const optRows: { input: HTMLInputElement; radio: HTMLInputElement }[] = [];
    const optWrap = div(dlg, 'mcq-opt-rows');
    for (let i = 0; i < 4; i++) optRows.push(mcqOptionRow(optWrap, i));
    const addBtn = button(dlg, '+ option', () => {
      optRows.push(mcqOptionRow(optWrap, optRows.length));
    });
    addBtn.className = 'btn';
    const answer = textInput(dlg, 'Answer (shown with explanation)');
    const explanation = textarea(dlg, 'Explanation');
    const err = errLine(dlg);
    button(dlg, 'Insert', () => {
      const opts = optRows.map((r) => ({ text: r.input.value.trim(), correct: r.radio.checked }));
      if (!question.value.trim() || opts.some((o) => !o.text)) {
        err.textContent = 'Question and all option texts are required.';
        return;
      }
      if (opts.filter((o) => o.correct).length !== 1) {
        err.textContent = 'Mark exactly one correct option.';
        return;
      }
      editor.chain().focus().insertContent({
        type: 'mcq',
        attrs: { data: encodeMcq({ question: question.value.trim(), options: opts, answer: answer.value.trim(), explanation: explanation.value.trim() }) },
      }).run();
      dlg.remove();
    }).className = 'btn btn-primary';
    document.body.appendChild(dlg);
  }

  function mcqOptionRow(parent: HTMLElement, index: number): { input: HTMLInputElement; radio: HTMLInputElement } {
    const row = document.createElement('div');
    row.className = 'mcq-opt-row';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'mcq-correct';
    radio.title = 'Correct answer';
    const label = document.createElement('span');
    label.textContent = `${'ABCDEFGH'[index]}. `;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Option text';
    row.append(radio, label, input);
    parent.appendChild(row);
    return { input, radio };
  }

  function insertReferences(): void {
    const dlg = dialog('Insert references');
    const rows: { title: HTMLInputElement; source: HTMLInputElement; year: HTMLInputElement; url: HTMLInputElement }[] = [];
    const wrap = div(dlg, 'ref-rows');
    rows.push(refRow(wrap));
    button(dlg, '+ reference', () => rows.push(refRow(wrap))).className = 'btn';
    const err = errLine(dlg);
    button(dlg, 'Insert', () => {
      const items = rows
        .map((r) => ({ title: r.title.value.trim(), source: r.source.value.trim(), year: r.year.value.trim(), url: r.url.value.trim() }))
        .filter((r) => r.title);
      if (!items.length) {
        err.textContent = 'At least one reference title is required.';
        return;
      }
      editor.chain().focus().insertContent({ type: 'references', attrs: { data: JSON.stringify(items) } }).run();
      dlg.remove();
    }).className = 'btn btn-primary';
    document.body.appendChild(dlg);
  }

  function refRow(parent: HTMLElement) {
    const row = document.createElement('div');
    row.className = 'ref-row';
    const mk = (ph: string, w: string) => {
      const i = document.createElement('input');
      i.type = 'text';
      i.placeholder = ph;
      i.style.width = w;
      row.appendChild(i);
      return i;
    };
    const title = mk('Title*', '34%');
    const source = mk('Source (journal/publisher)', '26%');
    const year = mk('Year', '10%');
    const url = mk('URL', '30%');
    parent.appendChild(row);
    return { title, source, year, url };
  }

  // Small DOM dialog helpers -------------------------------------------------
  function dialog(title: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'msn-dialog';
    d.innerHTML = `<h3></h3>`;
    (d.querySelector('h3') as HTMLElement).textContent = title;
    return d;
  }
  function div(parent: HTMLElement, cls: string): HTMLElement {
    const d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
  }
  function textInput(parent: HTMLElement, label: string): HTMLInputElement {
    const l = document.createElement('label');
    l.textContent = label;
    const i = document.createElement('input');
    i.type = 'text';
    l.appendChild(i);
    parent.appendChild(l);
    return i;
  }
  function textarea(parent: HTMLElement, label: string): HTMLTextAreaElement {
    const l = document.createElement('label');
    l.textContent = label;
    const t = document.createElement('textarea');
    t.rows = 3;
    l.appendChild(t);
    parent.appendChild(l);
    return t;
  }
  function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    parent.appendChild(b);
    return b;
  }
  function errLine(parent: HTMLElement): HTMLElement {
    const e = document.createElement('p');
    e.className = 'msn-dialog-error';
    parent.appendChild(e);
    return e;
  }

  // -------------------------------------------------------------------------
  // Media picker: upload or reuse (R2 via /api/media)
  // -------------------------------------------------------------------------

  interface MediaItem { id: number; r2_key: string; filename: string; mime_type: string; alt_text: string; }
  async function pickMedia(): Promise<{ url: string; alt: string } | null> {
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
      const err = errLine(dlg);
      uploadBtn.addEventListener('click', async () => {
        const f = file.files?.[0];
        if (!f) return;
        if (f.type.startsWith('image/') && alt.value.trim().length < 5) {
          err.textContent = 'Meaningful alt text (5+ characters) is required for images.';
          return;
        }
        const body = new FormData();
        body.set('file', f);
        body.set('altText', alt.value.trim());
        const res = await fetch('/api/media/', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok) {
          err.textContent = data.error ?? 'Upload failed.';
          return;
        }
        resolve({ url: data.url!, alt: alt.value.trim() });
        dlg.remove();
      });
      dlg.appendChild(uploadBtn);

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
            resolve({ url: `/media/${m.r2_key}/`, alt: m.alt_text });
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
  // Expose for the sidebar's featured-image picker.
  (window as unknown as Record<string, unknown>).msnPickMedia = pickMedia;

  // -------------------------------------------------------------------------
  // Internal linking (§7)
  // -------------------------------------------------------------------------

  const suggestBox = $('.link-suggest')!;
  const suggestInput = suggestBox.querySelector('input') as HTMLInputElement;
  const suggestResults = suggestBox.querySelector('ul') as HTMLUListElement;
  let suggestTimer: ReturnType<typeof setTimeout> | null = null;
  suggestInput.addEventListener('input', () => {
    if (suggestTimer) clearTimeout(suggestTimer);
    suggestTimer = setTimeout(async () => {
      const q = suggestInput.value.trim();
      if (!q) {
        suggestResults.innerHTML = '';
        return;
      }
      const res = await fetch(`/api/link-suggestions/?q=${encodeURIComponent(q)}&excludeId=${articleId}`);
      if (!res.ok) return;
      const data = await res.json() as { suggestions: { id: number; title: string; url: string; subject: string }[] };
      suggestResults.innerHTML = '';
      for (const s of data.suggestions) {
        const li = document.createElement('li');
        const a = document.createElement('button');
        a.type = 'button';
        a.textContent = `${s.title} (${s.subject})`;
        a.title = s.url;
        a.addEventListener('click', () => {
          if (editor.state.selection.empty) {
            editor.chain().focus().insertContent({ type: 'text', text: s.title, marks: [{ type: 'link', attrs: { href: s.url } }] }).run();
          } else {
            editor.chain().focus().setLink({ href: s.url }).run();
          }
        });
        li.appendChild(a);
        suggestResults.appendChild(li);
      }
    }, 300);
  });

  // Related suggestions → related-ids comma list in the sidebar.
  const relPanel = $('.related-suggest');
  if (relPanel) {
    const relList = relPanel.querySelector('ul') as HTMLUListElement;
    const relInput = field('relatedIds');
    const renderRelated = async () => {
      const subjectId = val('subjectId');
      const res = await fetch(`/api/link-suggestions/?excludeId=${articleId}&subjectId=${subjectId}`);
      if (!res.ok) return;
      const data = await res.json() as { suggestions: { id: number; title: string; url: string; subject: string }[] };
      relList.innerHTML = '';
      const current = new Set(
        (relInput as HTMLInputElement)?.value.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
      );
      for (const s of data.suggestions.slice(0, 10)) {
        const li = document.createElement('li');
        const a = document.createElement('button');
        a.type = 'button';
        a.textContent = current.has(String(s.id)) ? `✓ ${s.title}` : `+ ${s.title}`;
        a.addEventListener('click', () => {
          if (current.has(String(s.id))) current.delete(String(s.id));
          else current.add(String(s.id));
          (relInput as HTMLInputElement).value = [...current].join(',');
          a.textContent = current.has(String(s.id)) ? `✓ ${s.title}` : `+ ${s.title}`;
        });
        li.appendChild(a);
        relList.appendChild(li);
      }
    };
    renderRelated();
    field('subjectId')?.addEventListener('change', renderRelated);
  }

  // -------------------------------------------------------------------------
  // Autosave + status transitions (§11)
  // -------------------------------------------------------------------------

  const statusEl = $('.save-status')!;
  let dirty = false;
  let saving = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSave(): void {
    dirty = true;
    statusEl.textContent = 'Unsaved changes…';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 2500);
  }

  function buildBody(): string {
    return JSON.stringify({
      title: val('title'),
      slug: val('slug'),
      excerpt: val('excerpt'),
      articleType: val('articleType'),
      // Empty select value means "no category"; only sent for articles.
      category: val('articleType') === 'article' && val('category') ? val('category') : null,
      contentJson: editor.getJSON(),
      subjectId: val('subjectId') ? Number(val('subjectId')) : null,
      topicId: val('topicId') ? Number(val('topicId')) : null,
      featuredMediaId: val('featuredMediaId') ? Number(val('featuredMediaId')) : null,
      tagNames: val('tagNames').split(',').map((t) => t.trim()).filter(Boolean),
      relatedArticleIds: val('relatedIds').split(',').map((t) => t.trim()).filter(Boolean).map(Number),
      referenceIds: val('referenceIds').split(',').map((t) => t.trim()).filter(Boolean).map(Number),
      seoTitle: val('seoTitle') || null,
      metaDescription: val('metaDescription') || null,
      canonicalUrl: val('canonicalUrl') || null,
      ogTitle: val('ogTitle') || null,
      ogDescription: val('ogDescription') || null,
      ogImageMediaId: val('ogImageMediaId') ? Number(val('ogImageMediaId')) : null,
      robots: val('robots'),
      scheduledAt: val('scheduledAt') || null,
    });
  }

  async function save(): Promise<void> {
    if (saving || !dirty) return;
    saving = true;
    statusEl.textContent = 'Saving…';
    try {
      const res = await fetch(`/api/articles/${articleId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: buildBody(),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status}).`);
      dirty = false;
      statusEl.textContent = `Saved ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      statusEl.textContent = `Save failed: ${(err as Error).message}`;
    } finally {
      saving = false;
    }
  }

  // Mark dirty on any sidebar field change too.
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.editor-meta input, .editor-meta select, .editor-meta textarea')
    .forEach((el) => el.addEventListener('change', scheduleSave));

  const saveBtn = $('.save-now');
  saveBtn?.addEventListener('click', () => {
    if (saveTimer) clearTimeout(saveTimer);
    save();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (saveTimer) clearTimeout(saveTimer);
      save();
    }
  });

  async function setStatus(status: string, scheduledAt?: string): Promise<void> {
    // Flush pending edits first so the gate checks the latest content.
    if (saveTimer) clearTimeout(saveTimer);
    await save();
    const res = await fetch(`/api/articles/${articleId}/status/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ status, ...(scheduledAt ? { scheduledAt } : {}) }),
    });
    const data = await res.json() as { error?: string; checklist?: { items: { label: string; ok: boolean }[] } };
    const flash = $('.status-flash')!;
    if (!res.ok) {
      flash.className = 'flash flash-error';
      flash.textContent = data.error ?? 'Status change failed.';
      if (data.checklist) {
        const list = document.createElement('ul');
        for (const item of data.checklist.items) {
          const li = document.createElement('li');
          li.textContent = `${item.ok ? '✓' : '✗'} ${item.label}`;
          list.appendChild(li);
        }
        flash.appendChild(list);
      }
      return;
    }
    flash.className = 'flash flash-ok';
    flash.textContent = `Status: ${status}`;
    // Reload to refresh the page's status badge and buttons.
    setTimeout(() => window.location.reload(), 600);
  }

  $('.btn-submit-review')?.addEventListener('click', () => setStatus('review'));
  $('.btn-publish')?.addEventListener('click', () => setStatus('published'));
  $('.btn-unpublish')?.addEventListener('click', () => setStatus('unpublished'));
  $('.btn-schedule')?.addEventListener('click', () => {
    const when = (field('scheduledAt') as HTMLInputElement)?.value;
    if (!when) {
      const flash = $('.status-flash')!;
      flash.className = 'flash flash-error';
      flash.textContent = 'Pick a publication date/time first.';
      return;
    }
    setStatus('scheduled', new Date(when).toISOString());
  });

  // Featured-image picker button.
  $('.btn-pick-featured')?.addEventListener('click', async () => {
    const m = await pickMedia();
    if (!m) return;
    // Resolve the media id from the picker's picked URL via search API.
    const res = await fetch(`/api/media/?q=${encodeURIComponent(m.alt || '')}`);
    if (res.ok) {
      const data = await res.json() as { media: { id: number; r2_key: string }[] };
      const hit = data.media.find((x) => `/media/${x.r2_key}/` === m.url);
      if (hit) (field('featuredMediaId') as HTMLInputElement).value = String(hit.id);
      scheduleSave();
    }
  });

  // Topic picker follows subject selection.
  const subjectSel = field('subjectId') as HTMLSelectElement | null;
  const topicSel = field('topicId') as HTMLSelectElement | null;
  subjectSel?.addEventListener('change', () => {
    if (!topicSel) return;
    const subject = subjects.find((s) => String(s.id) === subjectSel.value);
    topicSel.innerHTML = '<option value="">— none —</option>';
    for (const t of subject?.topics ?? []) {
      const opt = document.createElement('option');
      opt.value = String(t.id);
      opt.textContent = t.title;
      topicSel.appendChild(opt);
    }
  });
}
