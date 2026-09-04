// Post-build sitemap generator. Walks dist/ for every emitted .html page
// and emits sitemap-index.xml + sitemap-0.xml. Kept as a local script
// because @astrojs/sitemap could not be installed at the time; swap back
// to the integration when `npm install @astrojs/sitemap` becomes possible.
//
// Run after `astro build`:  node scripts/generate-sitemap.mjs
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://devsyllabus.com';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

// Pages that must never appear in the sitemap.
const NOINDEX_MARKER = /<meta\s+name="robots"\s+content="noindex[^"]*"/i;
// Astro's static redirect stubs (meta-refresh) must not be sitemapped.
const REDIRECT_MARKER = /<meta\s+http-equiv="refresh"/i;
const EXCLUDED = ['/404/', '/search/'];

async function walkHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkHtml(full)));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const files = await walkHtml(DIST);
const now = new Date().toISOString();
const urls = [];

for (const file of files) {
  const rel = relative(DIST, file).replace(/\\/g, '/');
  // /blog/index.html -> /blog/ ; /index.html -> /
  const path =
    rel === 'index.html'
      ? '/'
      : '/' + rel.replace(/index\.html$/, '');

  if (EXCLUDED.includes(path)) continue;

  // Skip noindex pages and redirect stubs.
  const html = await readFile(file, 'utf8');
  if (NOINDEX_MARKER.test(html) || REDIRECT_MARKER.test(html)) continue;

  // lastmod from the file's own mtime: build output is freshly generated,
  // so this equals the content generation time.
  const mtime = (await stat(file)).mtime.toISOString();

  urls.push({ path, lastmod: mtime });
}

urls.sort((a, b) => a.path.localeCompare(b.path));

const urlset = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${SITE}${u.path === '/' ? '/' : u.path}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`,
  )
  .join('\n')}
</urlset>
`;

await writeFile(join(DIST, 'sitemap-0.xml'), urlset, 'utf8');

const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE}/sitemap-0.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>
`;

await writeFile(join(DIST, 'sitemap-index.xml'), index, 'utf8');

console.log(`sitemap: ${urls.length} URLs written to dist/sitemap-0.xml`);
