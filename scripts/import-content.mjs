#!/usr/bin/env node
/**
 * Generate migrations/0005_import_content.sql from the file-based content
 * collections (src/content/{notes,blog,questions}), importing them into the
 * D1 CMS so the admin editor becomes the single source of truth.
 *
 * - Markdown bodies (headings, paragraphs, bullet/ordered lists, tables,
 *   blockquotes, bold/italic/links) are converted to Tiptap JSON docs.
 * - Note frontmatter sections (overview, learning objectives, key terms,
 *   important points, formulas, summary, FAQs, references) are folded into
 *   the doc as rich-text sections and medical aside blocks.
 * - content_html is rendered with the site's own renderer
 *   (src/utils/richtext.ts, imported via Node's native TS type stripping)
 *   so stored HTML is exactly what public pages will display.
 * - Output is deterministic and idempotent: DELETE-then-INSERT scoped to the
 *   imported slugs, so re-running replaces rows instead of duplicating them.
 *   Where a 0003 seed row shares a slug (e.g. cardiac-cycle), the real
 *   imported content replaces the seed.
 *
 * Run from the project root:  node scripts/import-content.mjs
 *
 * NOTE: the source collections (src/content/{notes,blog,questions}) were
 * deleted after the import was applied and verified — the canonical copy of
 * that content now lives in D1 (and in migrations/0005_import_content.sql).
 * This script is kept as the record of how 0005 was generated; re-running it
 * requires restoring the collections from git history.
 * Then apply:                 npx wrangler d1 migrations apply medical-study-notes --local
 *
 * Note: js-yaml is a transitive dependency (via astro) — if it ever disappears
 * from node_modules, add it explicitly to devDependencies.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { renderTiptapDoc, readingMinutes } from '../src/utils/richtext.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src', 'content');
const OUT = path.join(ROOT, 'migrations', '0005_import_content.sql');

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Split a .md file into { data, body } using its YAML frontmatter. */
function parseFile(file) {
  const raw = readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`No frontmatter found: ${file}`);
  return { data: yaml.load(m[1]), body: m[2].trim() };
}

/** SQL string literal (single quotes doubled; semicolons inside are safe). */
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

/**
 * D1's canonical TEXT datetime ('YYYY-MM-DD HH:MM:SS', UTC). Accepts the
 * Date that Astro's content layer hands us, or a bare YYYY-MM-DD string.
 * Publishing is stamped at 09:00:00 UTC.
 */
const ts = (date) => {
  const d = date instanceof Date ? date : new Date(`${String(date).slice(0, 10)}T00:00:00Z`);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} 09:00:00`;
};

// ---------------------------------------------------------------------------
// Markdown → Tiptap inline parser (bold, italic, links)
// ---------------------------------------------------------------------------

const INLINE_RE = /(\*\*([^*]+?)\*\*)|(\*([^*\n]+?)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

// A fresh iterator per call (matchAll clones the regex), so the recursive
// link-text parse below can never clobber an in-progress match loop.
function parseInline(text) {
  const out = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[2] !== undefined) {
      out.push({ type: 'text', text: m[2], marks: [{ type: 'bold' }] });
    } else if (m[4] !== undefined) {
      out.push({ type: 'text', text: m[4], marks: [{ type: 'italic' }] });
    } else if (m[6] !== undefined) {
      for (const inner of parseInline(m[6])) {
        out.push({ ...inner, marks: [...(inner.marks ?? []), { type: 'link', attrs: { href: m[7] } }] });
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

// ---------------------------------------------------------------------------
// Markdown → Tiptap block parser (the subset our content uses)
// ---------------------------------------------------------------------------

const isStructural = (l) => /^(#{2,4}\s|[-*]\s|\d+\.\s|>|\s*\|)/.test(l);

function parseTableRow(row) {
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function mdToNodes(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const nodes = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      nodes.push({ type: 'heading', attrs: { level: h[1].length }, content: parseInline(h[2].trim()) });
      i++;
      continue;
    }

    // Table: consecutive | rows; first row is the header, |---| separators dropped.
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const r = lines[i].trim();
        if (!/^\|[\s:|-]+\|?$/.test(r)) rows.push(parseTableRow(r));
        i++;
      }
      if (rows.length) {
        const width = Math.max(...rows.map((r) => r.length));
        const norm = rows.map((r) => [...r, ...Array(width - r.length).fill('')]);
        const [head, ...body] = norm;
        nodes.push({
          type: 'table',
          content: [
            { type: 'tableRow', content: head.map((c) => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: parseInline(c) }] })) },
            ...body.map((r) => ({ type: 'tableRow', content: r.map((c) => ({ type: 'tableCell', content: [{ type: 'paragraph', content: parseInline(c) }] })) })),
          ],
        });
      }
      continue;
    }

    // Bullet list.
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^[-*]\s+/, '').trim()) }] });
        i++;
      }
      nodes.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(lines[i].replace(/^\d+\.\s+/, '').trim()) }] });
        i++;
      }
      nodes.push({ type: 'orderedList', content: items });
      continue;
    }

    // Blockquote (single paragraph; our content only has short ones).
    if (/^>\s?/.test(line)) {
      const qlines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qlines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      nodes.push({ type: 'blockquote', content: [{ type: 'paragraph', content: parseInline(qlines.join(' ').trim()) }] });
      continue;
    }

    // Paragraph: gather until a blank line or a structural line.
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isStructural(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    nodes.push({ type: 'paragraph', content: parseInline(para.join(' ').trim()) });
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Tiptap node builders for the structured frontmatter sections
// ---------------------------------------------------------------------------

const h = (level, text) => ({ type: 'heading', attrs: { level }, content: parseInline(text) });
const para = (text) => ({ type: 'paragraph', content: parseInline(text) });
const bulletListOf = (arr) => ({
  type: 'bulletList',
  content: arr.map((t) => ({ type: 'listItem', content: [para(t)] })),
});
const aside = (type, content) => ({ type, content });

/** References aside node (renderer: aside.msn-references with an <ol>). */
function referencesNode(refs) {
  if (!refs?.length) return null;
  return {
    type: 'references',
    attrs: {
      items: refs.map((r) => ({ title: r.title, source: r.source, year: r.year, url: r.url })),
    },
  };
}

/** Study-note doc: overview, body, then folded frontmatter sections. */
function noteDoc(d, bodyNodes) {
  const nodes = [];
  if (d.overview) nodes.push(h(2, 'Overview'), para(d.overview.trim()));
  nodes.push(...bodyNodes);
  if (d.learningObjectives?.length) {
    nodes.push(h(2, 'Learning objectives'), bulletListOf(d.learningObjectives.map((s) => s.trim())));
  }
  if (d.keyTerms?.length) {
    nodes.push(h(2, 'Key terms'));
    for (const t of d.keyTerms) {
      nodes.push(aside('definition', [{
        type: 'paragraph',
        content: [
          { type: 'text', text: t.term, marks: [{ type: 'bold' }] },
          { type: 'text', text: ` — ${String(t.definition).trim()}` },
        ],
      }]));
    }
  }
  if (d.importantPoints?.length) {
    nodes.push(h(2, 'Important points'), aside('important', [bulletListOf(d.importantPoints.map((s) => s.trim()))]));
  }
  if (d.formulas?.length) {
    nodes.push(h(2, 'Key formulas'));
    for (const f of d.formulas) {
      nodes.push(aside('keyPoint', [{
        type: 'paragraph',
        content: [
          { type: 'text', text: f.expression, marks: [{ type: 'bold' }] },
          ...(f.meaning ? [{ type: 'text', text: ` — ${String(f.meaning).trim()}` }] : []),
        ],
      }]));
    }
  }
  if (d.summary) nodes.push(h(2, 'Summary'), aside('keyPoint', [para(d.summary.trim())]));
  if (d.faqs?.length) {
    nodes.push(h(2, 'Frequently asked questions'));
    for (const f of d.faqs) {
      nodes.push(h(3, f.question), para(String(f.answer).trim()));
    }
  }
  const refs = referencesNode(d.references);
  if (refs) nodes.push(refs);
  return { type: 'doc', content: nodes };
}

/** Blog-article doc: body, then FAQs and references. */
function blogDoc(d, bodyNodes) {
  const nodes = [...bodyNodes];
  if (d.faqs?.length) {
    nodes.push(h(2, 'Frequently asked questions'));
    for (const f of d.faqs) {
      nodes.push(h(3, f.question), para(String(f.answer).trim()));
    }
  }
  const refs = referencesNode(d.references);
  if (refs) nodes.push(refs);
  return { type: 'doc', content: nodes };
}

// ---------------------------------------------------------------------------
// Chapter → D1 topic mapping (titles for topics that must be created)
// ---------------------------------------------------------------------------

/** Chapters whose D1 topic slug differs from the frontmatter chapter slug. */
const CHAPTER_REMAP = { 'abdomen-pelvis': 'abdomen' };

/** Display titles for chapter topics created by this import. */
const CHAPTER_TITLES = {
  'upper-limb': 'Upper Limb',
  abdomen: 'Abdomen',
  'head-and-neck': 'Head & Neck',
  cardiovascular: 'Cardiovascular System',
  respiratory: 'Respiratory System',
  'carbohydrate-metabolism': 'Carbohydrate Metabolism',
  enzymes: 'Enzymes',
  biomolecules: 'Biomolecules',
  'cell-injury': 'Cell Injury',
  autonomic: 'Autonomic Pharmacology',
  antimicrobials: 'Antimicrobials',
  'cardiovascular-drugs': 'Cardiovascular Drugs',
  'general-bacteriology': 'General Bacteriology',
  virology: 'Virology',
  asphyxia: 'Asphyxia',
  identification: 'Identification',
  epidemiology: 'Epidemiology',
  'communicable-diseases': 'Communicable Diseases',
  biostatistics: 'Biostatistics',
};

const chapterSlug = (c) => CHAPTER_REMAP[c] ?? c;
const chapterTitle = (c) => CHAPTER_TITLES[chapterSlug(c)] ?? chapterSlug(c).replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// ---------------------------------------------------------------------------
// Read the content collections
// ---------------------------------------------------------------------------

const mdFiles = (dir) => readdirSync(path.join(CONTENT, dir)).filter((f) => f.endsWith('.md'));

const notes = mdFiles('notes').map((f) => ({ file: f, slug: f.replace(/\.md$/, ''), ...parseFile(path.join(CONTENT, 'notes', f)) }));
const blogs = mdFiles('blog').map((f) => ({ file: f, slug: f.replace(/\.md$/, ''), ...parseFile(path.join(CONTENT, 'blog', f)) }));
const questions = mdFiles('questions').map((f) => ({ file: f, slug: f.replace(/\.md$/, ''), ...parseFile(path.join(CONTENT, 'questions', f)) }));

// Tag display names come from the (retained) topics collection.
const topicTitles = {};
for (const f of mdFiles('topics')) {
  const { data } = parseFile(path.join(CONTENT, 'topics', f));
  topicTitles[f.replace(/\.md$/, '')] = data.title;
}

// ---------------------------------------------------------------------------
// Build SQL
// ---------------------------------------------------------------------------

const sql = [];
sql.push(`-- 0005: import the file-based content collections into the D1 CMS.
-- GENERATED by scripts/import-content.mjs — do not edit by hand; re-run the
-- script instead. Idempotent: every INSERT is preceded by a scoped DELETE of
-- the same slugs (and their child rows), so re-applying replaces content.
-- Semicolons inside string literals are safe with wrangler 4.x (verified).`);

// --- topics (chapters) -------------------------------------------------------
sql.push(`
-- ---------------------------------------------------------------------------
-- Chapter topics (INSERT OR IGNORE: existing anatomy topics are reused;
-- 'abdomen-pelvis' maps onto the existing 'abdomen' topic)
-- ---------------------------------------------------------------------------`);

const neededTopics = new Map(); // `${subject}/${slug}` -> { subject, slug, title }
for (const item of [...notes, ...questions]) {
  const d = item.data;
  if (!d.subject || !d.chapter) continue;
  const slug = chapterSlug(d.chapter);
  neededTopics.set(`${d.subject}/${slug}`, { subject: d.subject, slug, title: chapterTitle(d.chapter) });
}
for (const t of neededTopics.values()) {
  sql.push(
    `INSERT OR IGNORE INTO topics (subject_id, title, slug, description, sort_order)\n` +
    `SELECT id, ${q(t.title)}, ${q(t.slug)}, '', 50 FROM subjects WHERE slug = ${q(t.subject)};`
  );
}

// --- tags --------------------------------------------------------------------
sql.push(`
-- ---------------------------------------------------------------------------
-- Tags (from frontmatter topics[]; titles come from the topics collection)
-- ---------------------------------------------------------------------------`);

const neededTags = new Map(); // slug -> name
for (const item of [...notes, ...blogs]) {
  for (const t of item.data.topics ?? []) {
    neededTags.set(t, topicTitles[t] ?? t.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()));
  }
}
for (const [slug, name] of neededTags) {
  sql.push(`INSERT OR IGNORE INTO tags (name, slug) VALUES (${q(name)}, ${q(slug)});`);
}

// --- article helper ----------------------------------------------------------

const AUTHOR = '(SELECT id FROM users ORDER BY id LIMIT 1)';
const subjectId = (s) => `(SELECT id FROM subjects WHERE slug = ${q(s)})`;
const topicId = (s, c) =>
  `(SELECT t.id FROM topics t WHERE t.slug = ${q(chapterSlug(c))} AND t.subject_id = ${subjectId(s)})`;

/**
 * Emit the scoped deletes + INSERT for one article (note or blog post).
 * Returns { doc } so callers can register references for the ref section.
 */
function emitArticle(item, articleType, doc) {
  const d = item.data;

  sql.push(`DELETE FROM article_tags WHERE article_id IN (SELECT id FROM articles WHERE article_type = ${q(articleType)} AND slug = ${q(item.slug)});`);
  sql.push(`DELETE FROM article_references WHERE article_id IN (SELECT id FROM articles WHERE article_type = ${q(articleType)} AND slug = ${q(item.slug)});`);
  sql.push(`DELETE FROM article_related WHERE article_id IN (SELECT id FROM articles WHERE article_type = ${q(articleType)} AND slug = ${q(item.slug)});`);
  sql.push(`DELETE FROM articles WHERE article_type = ${q(articleType)} AND slug = ${q(item.slug)};`);

  const cols = [
    'title', 'slug', 'excerpt', 'content_json', 'content_html', 'article_type', 'status',
    'subject_id', 'topic_id', 'author_id', 'published_at', 'seo_title', 'meta_description',
    'robots', 'reading_minutes', 'created_at', 'updated_at',
  ];
  if (articleType === 'article') cols.push('category');
  if (articleType === 'study-note') cols.push('level');
  cols.push('author_slug');

  const vals = [
    q(d.title),
    q(item.slug),
    q(String(d.description ?? '').trim()),
    q(JSON.stringify(doc)),
    q(renderTiptapDoc(doc)),
    q(articleType),
    q('published'),
    d.subject ? subjectId(d.subject) : 'NULL',
    d.subject && d.chapter ? topicId(d.subject, d.chapter) : 'NULL',
    AUTHOR,
    q(ts(d.publishedDate)),
    q(d.seoTitle ?? null),
    q(String(d.description ?? '').trim()),
    q('index,follow'),
    readingMinutes(doc),
    q(ts(d.publishedDate)),
    q(ts(d.updatedDate ?? d.publishedDate)),
  ];
  if (articleType === 'article') vals.push(q(d.category ?? null));
  if (articleType === 'study-note') vals.push(q(d.level ?? null));
  vals.push(q(d.author ?? null));

  sql.push(
    `INSERT INTO articles (\n  ${cols.join(', ')}\n) VALUES (\n  ${vals.join(',\n  ')}\n);`
  );

  // Tags
  for (const t of d.topics ?? []) {
    sql.push(
      `INSERT INTO article_tags (article_id, tag_id)\n` +
      `SELECT a.id, tg.id FROM articles a, tags tg\n` +
      `WHERE a.article_type = ${q(articleType)} AND a.slug = ${q(item.slug)} AND tg.slug = ${q(t)};`
    );
  }
}

// --- notes -------------------------------------------------------------------
sql.push(`
-- ---------------------------------------------------------------------------
-- Study notes (article_type = 'study-note'); replaces any 0003 seed row
-- sharing a slug (e.g. cardiac-cycle)
-- ---------------------------------------------------------------------------`);

for (const item of notes) {
  const doc = noteDoc(item.data, mdToNodes(item.body));
  emitArticle(item, 'study-note', doc);
}

// --- blog --------------------------------------------------------------------
sql.push(`
-- ---------------------------------------------------------------------------
-- Blog articles (article_type = 'article', organized by category)
-- ---------------------------------------------------------------------------`);

for (const item of blogs) {
  const doc = blogDoc(item.data, mdToNodes(item.body));
  emitArticle(item, 'article', doc);
  // relatedNotes → article_related (related side is the study note)
  for (const rel of item.data.relatedNotes ?? []) {
    sql.push(
      `INSERT OR IGNORE INTO article_related (article_id, related_article_id)\n` +
      `SELECT a.id, r.id FROM articles a, articles r\n` +
      `WHERE a.article_type = 'article' AND a.slug = ${q(item.slug)}\n` +
      `  AND r.article_type = 'study-note' AND r.slug = ${q(rel)};`
    );
  }
}

// --- references (deduped across all articles) --------------------------------
sql.push(`
-- ---------------------------------------------------------------------------
-- References: remove orphans left by the deletes above, insert the deduped
-- set once, then link each article to its reference rows by (title, source)
-- ---------------------------------------------------------------------------`);

sql.push(`DELETE FROM "references" WHERE id NOT IN (SELECT reference_id FROM article_references);`);

const refIndex = new Map(); // dedupe key -> reference
function refKey(r) { return JSON.stringify([r.title, r.source ?? '', r.year ?? '', r.url ?? '']); }
for (const item of [...notes, ...blogs]) {
  for (const r of item.data.references ?? []) refIndex.set(refKey(r), r);
}
for (const r of refIndex.values()) {
  sql.push(
    `INSERT INTO "references" (ref_type, title, source, year, url)\n` +
    `VALUES (${q(r.refType ?? 'textbook')}, ${q(r.title)}, ${q(r.source ?? null)}, ${q(r.year ?? null)}, ${q(r.url ?? null)});`
  );
}
for (const item of [...notes, ...blogs]) {
  const articleType = notes.includes(item) ? 'study-note' : 'article';
  (item.data.references ?? []).forEach((r, idx) => {
    sql.push(
      `INSERT INTO article_references (article_id, reference_id, sort_order)\n` +
      `SELECT a.id, rf.id, ${idx + 1} FROM articles a, "references" rf\n` +
      `WHERE a.article_type = ${q(articleType)} AND a.slug = ${q(item.slug)}\n` +
      `  AND rf.title = ${q(r.title)} AND rf.source = ${q(r.source ?? '')};`
    );
  });
}

// --- MCQs --------------------------------------------------------------------
sql.push(`
-- ---------------------------------------------------------------------------
-- MCQs (type = 'mcq'; the 3 short/long/numerical questions are retired)
-- ---------------------------------------------------------------------------`);

const mcqSlugs = [];
for (const item of questions) {
  const d = item.data;
  if (d.type !== 'mcq') {
    console.log(`  skip ${item.file} (type = ${d.type}, retired)`);
    continue;
  }
  const answerIdx = (d.options ?? []).findIndex((o) => o === d.answer);
  if (answerIdx < 0) {
    throw new Error(`${item.file}: answer does not exactly match any option`);
  }
  mcqSlugs.push(item.slug);
  sql.push(`DELETE FROM mcq_options WHERE mcq_id IN (SELECT id FROM mcqs WHERE slug = ${q(item.slug)});`);
  sql.push(`DELETE FROM mcqs WHERE slug = ${q(item.slug)};`);
  sql.push(
    `INSERT INTO mcqs (question, slug, level, explanation, status, subject_id, topic_id, difficulty, tags_json, created_by, created_at, updated_at)\n` +
    `VALUES (\n` +
    `  ${q(String(d.question).trim())}, ${q(item.slug)}, ${q(d.level ?? null)}, ${q(String(d.explanation ?? '').trim())}, 'published',\n` +
    `  ${subjectId(d.subject)}, ${topicId(d.subject, d.chapter)}, ${q(d.difficulty ?? 'medium')}, ${q(JSON.stringify(d.topics ?? []))},\n` +
    `  ${AUTHOR}, '2026-09-06 09:00:00', '2026-09-06 09:00:00'\n` +
    `);`
  );
  (d.options ?? []).forEach((opt, i) => {
    const label = String.fromCharCode(65 + i);
    sql.push(
      `INSERT INTO mcq_options (mcq_id, label, text, is_correct, sort_order)\n` +
      `SELECT id, ${q(label)}, ${q(opt)}, ${i === answerIdx ? 1 : 0}, ${i} FROM mcqs WHERE slug = ${q(item.slug)};`
    );
  });
}

// ---------------------------------------------------------------------------
// Write + report
// ---------------------------------------------------------------------------

writeFileSync(OUT, sql.join('\n') + '\n', 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`  notes:        ${notes.length} articles (study-note)`);
console.log(`  blog posts:   ${blogs.length} articles (article)`);
console.log(`  MCQs:         ${mcqSlugs.length} (+ options)`);
console.log(`  topics:       ${neededTopics.size} ensured`);
console.log(`  tags:         ${neededTags.size} ensured`);
console.log(`  references:   ${refIndex.size} unique rows`);
