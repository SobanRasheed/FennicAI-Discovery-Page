/**
 * Custom Tiptap nodes for the medical-education blocks (§4). Node names
 * MUST match the renderer in src/utils/richtext.ts:
 *   definition, keyPoint, clinicalPearl, important, warning, mcq, references
 *
 * Container blocks render an <aside data-type="..."> with a label paragraph;
 * atom blocks (mcq, references) serialize their attrs as JSON in a data
 * attribute so the round-trip through the server renderer is lossless.
 */
import { Node, mergeAttributes } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Container blocks: editable block content inside a labelled aside.
// ---------------------------------------------------------------------------

interface ContainerOptions {
  label: string;
}

function medicalContainer(name: string, typeName: string, label: string) {
  return Node.create<{ label: string } & Record<string, unknown>>({
    name,
    group: 'block',
    content: 'block+',
    defining: true,

    addOptions() {
      return { label } as ContainerOptions & Record<string, unknown>;
    },

    parseHTML() {
      return [{ tag: `aside[data-type="${typeName}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = mergeAttributes(HTMLAttributes, { 'data-type': typeName, class: `msn-block msn-${typeName}` });
      return ['aside', attrs, ['p', { class: 'msn-block-label' }, label], 0];
    },
  });
}

export const Definition = medicalContainer('definition', 'definition', 'Definition');
export const KeyPoint = medicalContainer('keyPoint', 'key-point', 'Key point');
export const ClinicalPearl = medicalContainer('clinicalPearl', 'clinical-pearl', 'Clinical pearl');
export const Important = medicalContainer('important', 'important', 'Important');
export const Warning = medicalContainer('warning', 'warning', 'Warning');

// ---------------------------------------------------------------------------
// Underline mark (not part of StarterKit).
// ---------------------------------------------------------------------------

import { Mark } from '@tiptap/core';

export const Underline = Mark.create({
  name: 'underline',
  parseHTML() {
    return [{ tag: 'u' }, { style: 'text-decoration', consuming: false, getAttrs: (v) => (v === 'underline' ? {} : false) }];
  },
  renderHTML() {
    return ['u', 0];
  },
});

// ---------------------------------------------------------------------------
// MCQ atom block
// ---------------------------------------------------------------------------

export interface McqAttrs {
  question: string;
  options: { text: string; correct: boolean }[];
  answer: string;
  explanation: string;
}

const encodeMcq = (attrs: McqAttrs): string =>
  JSON.stringify([attrs.question, attrs.options, attrs.answer, attrs.explanation]);

const decodeMcq = (raw: string): McqAttrs => {
  try {
    const [question, options, answer, explanation] = JSON.parse(raw);
    return {
      question: String(question ?? ''),
      options: Array.isArray(options) ? options : [],
      answer: String(answer ?? ''),
      explanation: String(explanation ?? ''),
    };
  } catch {
    return { question: '', options: [], answer: '', explanation: '' };
  }
};

export const McqBlock = Node.create({
  name: 'mcq',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      data: {
        default: encodeMcq({ question: '', options: [], answer: '', explanation: '' }),
        parseHTML: (el) => el.getAttribute('data-mcq') ?? '',
        renderHTML: (attrs) => ({ 'data-mcq': attrs.data ?? '' }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'aside[data-type="mcq"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as { data?: string };
    const mcq = attrs.data ? decodeMcq(attrs.data) : { question: '', options: [], answer: '', explanation: '' };
    const labels = 'ABCDEFGH';
    const correctIndex = mcq.options.findIndex((o) => o.correct);
    return [
      'aside',
      mergeAttributes(HTMLAttributes, { 'data-type': 'mcq', class: 'msn-block msn-mcq' }),
      ['p', { class: 'msn-block-label' }, 'Practice question'],
      ['p', { class: 'msn-mcq-question' }, mcq.question],
      [
        'ol',
        { class: 'msn-mcq-options', type: 'A' },
        ...mcq.options.map((o) => ['li', 0, o.text]),
      ],
      ['details', { class: 'msn-mcq-answer' }, ['summary', 0, 'Answer']],
      ['p', 0, `${correctIndex >= 0 ? `${labels[correctIndex]}. ` : ''}${mcq.answer} — ${mcq.explanation}`],
    ];
  },
});

// ---------------------------------------------------------------------------
// References atom block
// ---------------------------------------------------------------------------

export interface RefItem {
  title: string;
  source?: string;
  year?: string;
  url?: string;
}

export const ReferencesBlock = Node.create({
  name: 'references',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      data: {
        default: '[]',
        parseHTML: (el) => el.getAttribute('data-items') ?? '[]',
        renderHTML: (attrs) => ({ 'data-items': attrs.data ?? '[]' }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'aside[data-type="references"]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as { data?: string };
    let items: RefItem[] = [];
    try {
      items = JSON.parse(attrs.data ?? '[]');
    } catch {
      items = [];
    }
    return [
      'aside',
      mergeAttributes(HTMLAttributes, { 'data-type': 'references', class: 'msn-block msn-references' }),
      ['p', { class: 'msn-block-label' }, 'References'],
      ['ol', 0, ...items.map((r) => ['li', 0, [r.title, r.source, r.year].filter(Boolean).join('. ')])],
    ];
  },
});
