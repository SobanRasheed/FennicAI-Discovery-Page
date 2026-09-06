/**
 * Generate contextual site imagery with DashScope (qwen-image-3.0-pro).
 *
 * Covers every spot that currently falls back to vector icons / decorative
 * PNGs: subject hero panels and article thumbnails. Images are generated to
 * match the site's warm editorial style, saved to d:\tmp\gen-images\, then
 * (with --upload) stored in the local R2 bucket + media table and wired to
 * their subject/article rows.
 *
 * Usage:
 *   node scripts/generate-media.mjs [--only <slug>]   # generate images
 *   node scripts/generate-media.mjs --upload          # + store in R2/D1
 *
 * The API key is read from .dev.vars (never committed).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = resolve(ROOT, 'd:\\tmp\\gen-images');
const API_URL =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// --- API key from .dev.vars -------------------------------------------------
function readApiKey() {
  if (process.env.DASHSCOPE_API_KEY) return process.env.DASHSCOPE_API_KEY;
  const vars = readFileSync(join(ROOT, '.dev.vars'), 'utf8');
  const m = vars.match(/^DASHSCOPE_API_KEY=(.+)$/m);
  if (!m) throw new Error('DASHSCOPE_API_KEY not found in .dev.vars');
  return m[1].trim();
}

// --- shared visual style (matches the site's cream/ink editorial look) ------
const STYLE =
  'Clean modern flat editorial illustration for a medical education website, ' +
  'warm cream ivory background, muted teal and soft coral accent colors, ' +
  'subtle warm gray line details, minimal composition, generous negative ' +
  'space, soft rounded organic shapes, gentle paper grain texture, ' +
  'no text, no letters, no words, no numbers, no watermark, professional and calm';

const SIZES = { landscape: '1664*928', square: '1328*1328', portrait: '928*1664' };

// --- job list ----------------------------------------------------------------
/** Subject hero art (square panels on /subjects/[slug]/). */
const SUBJECTS = [
  ['anatomy', 'A lateral human skull beside a vertebra segment, anatomical study theme'],
  ['physiology', 'A stylized anatomical heart with a soft heartbeat waveform flowing through it'],
  ['biochemistry', 'A DNA double helix intertwined with glucose molecule rings and a small laboratory flask'],
  ['pharmacology', 'A capsule pill with a mortar and pestle and medicinal leaves'],
  ['pathology', 'Irregular abnormal cells with dark nuclei in a microscope field'],
  ['microbiology', 'A compound microscope with cocci clusters and rod-shaped bacteria floating nearby'],
  ['forensic-medicine', 'A magnifying glass over small evidence markers and a fingerprint card'],
  ['community-medicine', 'A protective umbrella sheltering a community of diverse people silhouettes with a medical cross'],
  ['medicine', 'A stethoscope draped over a clipboard medical chart'],
  ['surgery', 'Surgical instruments — scalpel, forceps, scissors — laid out in a neat row'],
  ['pediatrics', 'A friendly teddy bear wearing a toy stethoscope beside building blocks'],
  ['obstetrics-gynecology', 'Gentle hands cradling a pregnant belly silhouette with a small heart above'],
  ['ent', 'An ear, a nose in profile, and an open throat arranged as three studies'],
  ['ophthalmology', 'A detailed human eye with iris and light reflection, with subtle chart dots fading behind'],
  ['radiology', 'X-ray film sheets of a chest and a hand clipped to a glowing light box'],
  ['dermatology', 'A smooth stratified illustration of soft rounded layers with a gentle sprout-like follicle growing from the top layer'],
];

/** Article thumbnails (landscape cards on /blog/, /notes/, home). */
const ARTICLES = [
  ['gram-positive-bacteria', 'Deep purple stained spherical cocci bacteria in clusters under a microscope view'],
  ['cranial-nerves', 'The underside of a human brain with pairs of cranial nerves branching outward like tree roots'],
  ['antibiotics', 'Assorted capsules and tablets forming a shield wall stopping approaching bacteria'],
  ['asphyxia', 'A pair of human lungs with fading oxygen molecules and a small struggling flame of breath'],
  ['autonomic-pharmacology', 'A human silhouette with branching nerve pathways on both sides, one path holding a single pill'],
  ['brachial-plexus', 'The brachial plexus nerve network branching from the spine into a shoulder and arm'],
  ['cardiac-cycle', 'An anatomical heart with heart chambers and a circular heartbeat waveform cycle around it'],
  ['cell-injury', 'A single large cell with a damaged leaky membrane and a healthy cell beside it for contrast'],
  ['glycolysis', 'A glucose molecule splitting into two smaller pyruvate molecules along a winding metabolic path with energy sparks'],
  ['gram-positive-vs-gram-negative', 'Two bacteria compared side by side, one stained deep purple and one stained pink, divided by a thin line'],
  ['incidence-vs-prevalence', 'A grid of people icons with a few newly highlighted cases flowing in versus many existing cases, epidemiology concept'],
  ['active-recall-spaced-repetition', 'A student recalling flashcards laid out on a calendar with growing review intervals'],
  ['pathology-mcq-mistakes', 'A multiple choice answer sheet with a pencil and a magnifying glass reviewing the options'],
  ['study-anatomy-first-year-mbbs', 'A medical student at a desk studying an anatomy atlas with a small skeleton model beside them'],
];

const ALT = {
  anatomy: 'Skull and vertebra illustration',
  physiology: 'Heart with heartbeat waveform illustration',
  biochemistry: 'DNA helix and molecules illustration',
  pharmacology: 'Capsule and mortar illustration',
  pathology: 'Abnormal cells illustration',
  microbiology: 'Microscope and bacteria illustration',
  'forensic-medicine': 'Magnifying glass and evidence illustration',
  'community-medicine': 'Protective umbrella over community illustration',
  medicine: 'Stethoscope and chart illustration',
  surgery: 'Surgical instruments illustration',
  pediatrics: 'Teddy bear with stethoscope illustration',
  'obstetrics-gynecology': 'Hands cradling pregnancy silhouette illustration',
  ent: 'Ear, nose and throat illustration',
  ophthalmology: 'Human eye illustration',
  radiology: 'X-ray films on light box illustration',
  dermatology: 'Skin layers illustration',
  'gram-positive-bacteria': 'Gram positive cocci under microscope',
  'cranial-nerves': 'Cranial nerves branching from the brain',
  antibiotics: 'Capsules forming a shield against bacteria',
  asphyxia: 'Lungs with fading oxygen',
  'autonomic-pharmacology': 'Autonomic nerve pathways with a pill',
  'brachial-plexus': 'Brachial plexus nerve network',
  'cardiac-cycle': 'Heart with heartbeat cycle',
  'cell-injury': 'Damaged cell beside a healthy cell',
  glycolysis: 'Glucose splitting into pyruvate',
  'gram-positive-vs-gram-negative': 'Purple and pink stained bacteria compared',
  'incidence-vs-prevalence': 'New cases versus existing cases in a population',
  'active-recall-spaced-repetition': 'Flashcards on a spaced review calendar',
  'pathology-mcq-mistakes': 'Reviewing a multiple choice answer sheet',
  'study-anatomy-first-year-mbbs': 'Student studying an anatomy atlas',
};

// --- DashScope call ------------------------------------------------------------
async function generate(apiKey, prompt, size) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'qwen-image-2.0',
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters: { prompt_extend: true, size: SIZES[size] },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DashScope ${res.status}: ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  const content = data?.output?.choices?.[0]?.message?.content;
  let url;
  if (Array.isArray(content)) {
    url = content.find((c) => c && typeof c === 'object' && 'image' in c)?.image;
  } else if (typeof content === 'string') {
    url = content.match(/https?:\/\/\S+/)?.[0];
  }
  if (!url) throw new Error(`No image URL in response: ${text.slice(0, 400)}`);
  const img = await fetch(url);
  if (!img.ok) throw new Error(`Image download failed (${img.status})`);
  const mime = img.headers.get('content-type')?.split(';')[0] ?? 'image/png';
  return { bytes: Buffer.from(await img.arrayBuffer()), mime };
}

// --- upload into R2 + D1 -------------------------------------------------
// Default targets the local miniflare state; --remote targets production
// (requires wrangler auth + the real bucket/D1).
// Wrangler is invoked via node directly: `npx` is npx.cmd on Windows and
// Node won't spawn .cmd files without a shell (which breaks arg quoting).
const WRANGLER_BIN = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(remote, ...args) {
  return execFileSync(
    process.execPath,
    [
      WRANGLER_BIN, ...args,
      remote ? '--remote' : '--local', '--persist-to', '.wrangler/state',
    ],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

/** Parse wrangler --json output (log lines may precede the JSON array). */
function parseWranglerJson(out) {
  const start = out.search(/\[\s*\{/);
  if (start < 0) throw new Error(`Unexpected wrangler output: ${out.slice(0, 200)}`);
  return JSON.parse(out.slice(start).trim())[0].results;
}

/** Insert (or reuse) the media row for a key; returns the media id. */
function uploadToMedia(remote, slug, file, mime, alt, title) {
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  const key = `ai/2026/09/${slug}.${ext}`;
  const existing = parseWranglerJson(
    wrangler(remote, 'd1', 'execute', 'medical-study-notes', '--json',
      '--command', `SELECT id FROM media WHERE r2_key='${key}'`),
  );
  if (existing.length > 0) return existing[0].id;

  wrangler(
    remote, 'r2', 'object', 'put', `medical-study-notes-media/${key}`,
    '--file', file, '--content-type', mime,
  );
  const size = statSync(file).size;
  const sql =
    `INSERT INTO media (r2_key, filename, mime_type, size_bytes, alt_text, title, uploaded_by) ` +
    `VALUES ('${key}', '${slug}.${ext}', '${mime}', ${size}, '${alt.replace(/'/g, "''")}', ` +
    `'${title.replace(/'/g, "''")}', 1);`;
  wrangler(remote, 'd1', 'execute', 'medical-study-notes', '--command', sql);
  return parseWranglerJson(
    wrangler(remote, 'd1', 'execute', 'medical-study-notes', '--json',
      '--command', `SELECT id FROM media WHERE r2_key='${key}'`),
  )[0].id;
}

// --- main -----------------------------------------------------------------------
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const doUpload = args.includes('--upload');
const remote = args.includes('--remote');
const apiKey = readApiKey();
mkdirSync(OUT_DIR, { recursive: true });

const jobs = [
  ...SUBJECTS.map(([slug, prompt]) => ({ slug, prompt, size: 'square', kind: 'subject', title: slug })),
  ...ARTICLES.map(([slug, prompt]) => ({ slug, prompt, size: 'landscape', kind: 'article', title: slug })),
];

const results = [];
for (const job of jobs) {
  if (only && job.slug !== only) continue;
  const file = join(OUT_DIR, `${job.slug}.png`);
  try {
    if (!existsSync(file)) {
      process.stdout.write(`Generating ${job.slug} (${job.size})… `);
      const { bytes, mime } = await generate(apiKey, `${job.prompt}. ${STYLE}`, job.size);
      const path = mime === 'image/png' ? file : file.replace(/\.png$/, mime === 'image/jpeg' ? '.jpg' : '.webp');
      writeFileSync(path, bytes);
      process.stdout.write(`ok (${(bytes.length / 1024).toFixed(0)} KB, ${mime})\n`);
      results.push({ ...job, file: path, mime });
    } else {
      console.log(`Skipping ${job.slug} (already generated)`);
      results.push({ ...job, file, mime: 'image/png' });
    }
  } catch (err) {
    console.error(`FAILED ${job.slug}: ${err.message}`);
  }
}

if (doUpload) {
  for (const r of results) {
    try {
      process.stdout.write(`Uploading ${r.slug}… `);
      const mediaId = uploadToMedia(remote, r.slug, r.file, r.mime, ALT[r.slug] ?? r.slug, r.title);
      const table = r.kind === 'subject' ? 'subjects' : 'articles';
      const col = r.kind === 'subject' ? 'image_media_id' : 'featured_media_id';
      wrangler(
        remote, 'd1', 'execute', 'medical-study-notes',
        '--command', `UPDATE ${table} SET ${col}=${mediaId} WHERE slug='${r.slug}'`,
      );
      console.log(`media #${mediaId} → ${table}.${col}`);
    } catch (err) {
      console.error(`FAILED upload ${r.slug}: ${err.message}`);
    }
  }
}
