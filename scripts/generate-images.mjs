#!/usr/bin/env node
/**
 * Generate site icons/thumbnails with the DashScope qwen-image-3.0-pro API
 * (https://dashscope-intl.aliyuncs.com, multimodal-generation endpoint).
 *
 * Images are saved as static files under public/assets/ so they are served
 * directly by the site (the same pattern as the existing landing thumbs and
 * subject icons). Article-featured images in R2/D1 stay untouched; to use a
 * generated image as a featured image, upload it through the admin media
 * library as usual.
 *
 * Usage:
 *   # one-off generation
 *   node scripts/generate-images.mjs --prompt "..." --out public/assets/images/foo.png
 *
 *   # batch from a jobs file (recommended — see scripts/image-jobs.json)
 *   node scripts/generate-images.mjs --jobs scripts/image-jobs.json
 *   node scripts/generate-images.mjs --jobs scripts/image-jobs.json --only foo,bar
 *   node scripts/generate-images.mjs --jobs scripts/image-jobs.json --force
 *
 * The API key is read from DASHSCOPE_API_KEY (process env, then .env in the
 * project root). Never commit the key — .env is gitignored.
 *
 * Generation is idempotent: jobs whose output file already exists are skipped
 * unless --force is given.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT =
  'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const MODEL = 'qwen-image-3.0-pro';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

// ---------------------------------------------------------------------------
// API key: process env, then .env in the project root
// ---------------------------------------------------------------------------

function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !m[2].startsWith('"') && !m[2].startsWith("'")) {
      process.env[m[1]] ??= m[2];
    }
  }
}

loadEnvFile();
const API_KEY = process.env.DASHSCOPE_API_KEY;
if (!API_KEY) {
  console.error(
    'DASHSCOPE_API_KEY is not set. Put it in .env (DASHSCOPE_API_KEY=sk-...) or export it.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// DashScope call + download
// ---------------------------------------------------------------------------

const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Generate one image and save it to `out` (relative to the project root).
 * Returns the absolute path written. DashScope returns a temporary URL
 * (expires ~24h), so the bytes are downloaded immediately.
 */
async function generate({ prompt, out, size, alt }) {
  const absOut = path.resolve(ROOT, out);

  // DashScope wants "W*H"; accept both "WxH" and "W*H".
  const normalizedSize = size ? String(size).trim().toLowerCase().replace('x', '*') : undefined;
  const parameters = { prompt_extend: true };
  if (normalizedSize) parameters.size = normalizedSize;

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }],
            },
          ],
        },
        parameters,
      }),
    });
  } catch (e) {
    throw new Error(`request failed: ${e.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const imageUrl = data?.output?.choices?.[0]?.message?.content?.find((c) => c.image)?.image;
  if (!imageUrl) {
    throw new Error(`no image in response (request_id: ${data?.request_id ?? 'unknown'})`);
  }

  const img = await fetch(imageUrl);
  if (!img.ok) throw new Error(`downloading image failed: HTTP ${img.status}`);

  // Prefer the caller's extension; fall back to the response content type.
  const ext = path.extname(absOut).slice(1);
  const mime = img.headers.get('content-type')?.split(';')[0] || '';
  if (!ext && MIME_EXT[mime]) {
    absOut = absOut + '.' + MIME_EXT[mime];
  }

  const bytes = Buffer.from(await img.arrayBuffer());
  mkdirSync(path.dirname(absOut), { recursive: true });
  writeFileSync(absOut, bytes);

  if (alt) {
    console.log(`  alt: ${alt}`);
  }
  return path.relative(ROOT, absOut).replaceAll('\\', '/');
}

// ---------------------------------------------------------------------------
// Modes: single (--prompt/--out) or batch (--jobs)
// ---------------------------------------------------------------------------

async function main() {
  const jobsFile = flag('jobs');

  if (jobsFile) {
    const jobs = JSON.parse(readFileSync(path.resolve(ROOT, jobsFile), 'utf8'));
    if (!Array.isArray(jobs)) {
      console.error(`Jobs file must be a JSON array (see scripts/image-jobs.json).`);
      process.exit(1);
    }

    const only = has('only') ? flag('only').split(',').map((s) => s.trim()) : null;
    const force = has('force');

    let done = 0;
    let skipped = 0;
    let failed = 0;

    for (const job of jobs) {
      const { id, out, prompt, size, alt } = job;
      if (!id || !out || !prompt) {
        console.warn(`skip malformed job (needs id, out, prompt): ${JSON.stringify(job).slice(0, 120)}`);
        continue;
      }
      if (only && !only.includes(id)) continue;

      const absOut = path.resolve(ROOT, out);
      if (existsSync(absOut) && !force) {
        console.log(`skip  ${id} (${out} exists)`);
        skipped++;
        continue;
      }

      process.stdout.write(`gen   ${id} … `);
      try {
        const written = await generate({ prompt, out, size, alt });
        const bytes = statSync(path.resolve(ROOT, written)).size;
        console.log(`→ ${written} (${(bytes / 1024).toFixed(0)} KB)`);
        done++;
      } catch (e) {
        console.log(`FAILED: ${e.message}`);
        failed++;
      }
    }

    console.log(`\n${done} generated, ${skipped} skipped, ${failed} failed.`);
    if (failed) process.exit(1);
    return;
  }

  const prompt = flag('prompt');
  const out = flag('out');
  if (!prompt || !out) {
    console.error(
      'Need either --jobs <file> or both --prompt "..." and --out <path>.\n' +
        'Optional: --size WxH (e.g. 1024x1024 → "1024*1024"), --force.',
    );
    process.exit(1);
  }

  const size = flag('size')?.replace('x', '*');
  const written = await generate({ prompt, out, size });
  console.log(`Wrote ${written}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
