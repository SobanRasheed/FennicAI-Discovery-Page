/**
 * HTML sanitization for rich-text content, and the Tiptap JSON → semantic
 * HTML renderer used both by the editor (preview) and the public pages.
 *
 * Custom medical node types render as clean semantic blocks:
 *   definition, keyPoint, clinicalPearl, important, warning, mcq, references
 */
import sanitizeHtml from 'sanitize-html';

/** Sanitized rich-text HTML (Tiptap getHTML output). XSS-safe output. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'blockquote',
      'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'del', 'sub', 'sup',
      'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'span', 'div',
      // medical blocks (custom Tiptap nodes)
      'aside', 'details', 'summary', 'dl', 'dt', 'dd',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      '*': ['class', 'data-type', 'data-label', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      // Force safe link semantics on every anchor.
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener' }),
      // Lazy-load images on the public site.
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
    allowedStyles: {
      '*': { 'text-align': [/^(left|center|right|justify)$/] },
    },
    exclusiveFilter: (frame) =>
      // Drop images without meaningful alt text (educational accessibility).
      frame.tag === 'img' && (!frame.attribs.alt || !frame.attribs.alt.trim()),
  });
}

/**
 * Render a Tiptap JSON document to sanitized, semantic HTML. The editor's
 * own getHTML() is used for live editing; this is the authoritative
 * server-side render used when saving and on the public site, so what is
 * stored is exactly what the public page displays.
 */
export function renderTiptapDoc(doc: unknown): string {
  const html = docToHtml(doc);
  return sanitizeRichText(html);
}

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: JsonNode[];
};

const MARK_TAGS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  code: 'code',
  subscript: 'sub',
  superscript: 'sup',
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeAttr = escapeHtml;

/** Render inline text with its marks (bold, italic, links, ...). */
function renderInline(node: JsonNode): string {
  if (node.type === 'hardBreak') return '<br />';
  if (node.text === undefined) return '';
  let text = escapeHtml(node.text);
  let link: string | null = null;
  for (const mark of node.marks ?? []) {
    if (mark.type === 'link') {
      const href = String(mark.attrs?.href ?? '');
      if (/^https?:|^mailto:|^\/|^#/i.test(href)) link = href;
      continue;
    }
    const tag = MARK_TAGS[mark.type];
    if (tag) text = `<${tag}>${text}</${tag}>`;
  }
  return link ? `<a href="${escapeAttr(link)}" rel="noopener">${text}</a>` : text;
}

/** Render a node's children (block context). */
function renderChildren(node: JsonNode): string {
  return (node.content ?? []).map((child) => nodeToHtml(child)).join('');
}

function nodeToHtml(node: JsonNode): string {
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case 'doc':
      return renderChildren(node);

    case 'paragraph':
    case 'heading': {
      const inner = (node.content ?? []).map(renderInline).join('');
      if (node.type === 'heading') {
        const level = Number(attrs.level);
        const tag = `h${Math.min(Math.max(level || 2, 1), 6)}`;
        const align = String(attrs.textAlign ?? '');
        const style = align ? ` style="text-align:${align}"` : '';
        return `<${tag}${style}>${inner}</${tag}>`;
      }
      const align = String(attrs.textAlign ?? '');
      const style = align ? ` style="text-align:${align}"` : '';
      return `<p${style}>${inner}</p>`;
    }

    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`;
    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`;
    case 'listItem':
      return `<li>${renderChildren(node)}</li>`;

    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`;

    case 'horizontalRule':
      return '<hr />';

    case 'hardBreak':
      return '<br />';

    case 'image': {
      const src = String(attrs.src ?? '');
      const alt = String(attrs.alt ?? '');
      const title = attrs.title ? String(attrs.title) : null;
      // Only site-relative and https sources survive sanitization.
      if (!/^\/|^https:\/\//i.test(src)) return '';
      return `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${title ? ` title="${escapeAttr(title)}"` : ''} loading="lazy" /></figure>`;
    }

    case 'table': {
      const rows = renderChildren(node);
      return `<table><tbody>${rows}</tbody></table>`;
    }
    case 'tableRow':
      return `<tr>${renderChildren(node)}</tr>`;
    case 'tableCell':
    case 'tableHeader': {
      const tag = node.type === 'tableHeader' ? 'th' : 'td';
      return `<${tag}>${renderChildren(node)}</${tag}>`;
    }

    // --- custom medical blocks -------------------------------------------
    case 'definition':
      return `<aside class="msn-block msn-definition" data-type="definition"><p class="msn-block-label">Definition</p>${renderChildren(node)}</aside>`;
    case 'keyPoint':
      return `<aside class="msn-block msn-key-point" data-type="key-point"><p class="msn-block-label">Key point</p>${renderChildren(node)}</aside>`;
    case 'clinicalPearl':
      return `<aside class="msn-block msn-clinical-pearl" data-type="clinical-pearl"><p class="msn-block-label">Clinical pearl</p>${renderChildren(node)}</aside>`;
    case 'important':
      return `<aside class="msn-block msn-important" data-type="important"><p class="msn-block-label">Important</p>${renderChildren(node)}</aside>`;
    case 'warning':
      return `<aside class="msn-block msn-warning" data-type="warning"><p class="msn-block-label">Warning</p>${renderChildren(node)}</aside>`;

    case 'mcq': {
      const question = escapeHtml(String(attrs.question ?? ''));
      const options = Array.isArray(attrs.options)
        ? (attrs.options as { text: string; correct?: boolean }[])
        : [];
      const answer = escapeHtml(String(attrs.answer ?? ''));
      const explanation = escapeHtml(String(attrs.explanation ?? ''));
      const labels = 'ABCDEFGH';
      return `<aside class="msn-block msn-mcq" data-type="mcq"><p class="msn-block-label">Practice question</p><p class="msn-mcq-question">${question}</p><ol class="msn-mcq-options" type="A">${options
        .map((o, i) => `<li>${escapeHtml(o.text)}</li>`)
        .join('')}</ol><details class="msn-mcq-answer"><summary>Answer</summary><p><strong>${labels[options.findIndex((o) => o.correct)] ?? ''}.</strong> ${answer}</p><p>${explanation}</p></details></aside>`;
    }

    case 'references': {
      const refs = Array.isArray(attrs.items)
        ? (attrs.items as { title: string; source?: string; year?: string; url?: string }[])
        : [];
      return `<aside class="msn-block msn-references" data-type="references"><p class="msn-block-label">References</p><ol>${refs
        .map((r) => {
          const label = escapeHtml([r.title, r.source, r.year].filter(Boolean).join('. '));
          return r.url && /^https?:/i.test(r.url)
            ? `<li><a href="${escapeAttr(r.url)}" rel="noopener">${label}</a></li>`
            : `<li>${label}</li>`;
        })
        .join('')}</ol></aside>`;
    }

    default:
      // Unknown node types are skipped, never rendered raw.
      return '';
  }
}

/** Rough reading-time estimate for a Tiptap doc. */
export function readingMinutes(doc: unknown): number {
  const text = collectText(doc);
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

function collectText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as JsonNode;
  const own = n.text ?? '';
  const children = (n.content ?? []).map(collectText).join(' ');
  const attrsText = [n.attrs?.question, n.attrs?.answer, n.attrs?.explanation]
    .filter((v) => typeof v === 'string')
    .join(' ');
  return `${own} ${children} ${attrsText}`;
}
