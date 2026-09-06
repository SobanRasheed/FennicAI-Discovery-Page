/**
 * Post-build site audit. Verifies properties of dist/ that the compiler
 * cannot: every internal link resolves to a built page, every JSON-LD
 * block parses, every page has exactly one <h1>, and titles and meta
 * descriptions exist and are unique. Run after `npm run build`:
 *
 *   node scripts/check-site.mjs
 *
 * Exits non-zero when anything needs fixing.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The Cloudflare adapter emits static assets to dist/client/ (the Worker
// entry lives in dist/server/ and serves these at the site root).
const distDir = fileURLToPath(new URL('../dist/client/', import.meta.url));
const pagesDir = fileURLToPath(new URL('../src/pages/', import.meta.url));

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * Server-rendered routes (`export const prerender = false`) are served by the
 * Worker at request time, so they have no file in dist/client/. Links to them
 * are not broken — they are verified against the running worker instead (the
 * curl sweep). Build a pattern per SSR page file: dynamic segments ([slug])
 * match one path segment, rest segments ([...slug]) match any remainder.
 */
const ssrRouteRes = (() => {
  const patterns = [];
  for (const file of walk(pagesDir, ['.astro'])) {
    if (!/prerender\s*=\s*false/.test(readFileSync(file, 'utf8'))) continue;
    let route = file.slice(pagesDir.length).replaceAll('\\', '/');
    route = route.replace(/(?:^|\/)index\.astro$/, '/');
    route = route.replace(/\.astro$/, '');
    // Normalize to the URL form: leading slash, bare "/" for the root.
    if (route !== '/' && !route.startsWith('/')) route = '/' + route;
    // [...rest] swallows everything to the end; [param] matches one segment.
    // A trailing '/?' keeps both '/notes' and '/notes/' forms working.
    const regex = new RegExp(
      route === '/'
        ? '^/$'
        : '^' +
            route
              .split('/')
              .map((seg) =>
                seg.startsWith('[...')
                  ? '[\\s\\S]*'
                  : seg.startsWith('[')
                    ? '[^/]+'
                    : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              )
              .join('/') +
            '/?$',
    );
    patterns.push(regex);
  }
  return patterns;
})();

/** True when a URL is served by an SSR route instead of a static file. */
function isSsrRoute(url) {
  let path = url.split('#')[0].split('?')[0];
  if (path === '') path = '/';
  return ssrRouteRes.some((re) => re.test(path));
}

function walkHtml(dir) {
  return walk(dir, ['.html']);
}

const files = walkHtml(distDir).sort();

/** Resolve an internal URL to a file on disk, or null. */
function resolveTarget(url) {
  let path = url.split('#')[0].split('?')[0];
  if (path === '' || path === '/') path = '/';
  // Trailing-slash URLs map to directory index pages.
  if (path.endsWith('/')) {
    const candidate = join(distDir, path, 'index.html');
    return existsSync(candidate) ? candidate : null;
  }
  // Extensionless or file URLs.
  const asFile = join(distDir, path);
  if (existsSync(asFile) && statSync(asFile).isFile()) return asFile;
  const asIndex = join(distDir, path, 'index.html');
  return existsSync(asIndex) ? asIndex : null;
}

const brokenLinks = new Map(); // "target" -> Set of referring pages
const jsonldErrors = [];
const h1Issues = [];
const titleIssues = [];
const missingDescriptions = [];
const emptyHrefs = [];
const titles = new Map(); // title -> Set of pages
const descriptions = new Map(); // description -> Set of pages

const HREF_RE = /<a\b[^>]*\bhref="([^"]*)"[^>]*>/g;
const SCRIPT_RE = /<script[\s\S]*?<\/script>/g;
const JSONLD_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const DATA_JSON_RE = /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;

/** Collect every "url" string value in a parsed JSON structure. */
function collectUrls(value, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'url' && typeof item === 'string') out.push(item);
      else collectUrls(item, out);
    }
  }
}

for (const file of files) {
  const rel = file.slice(distDir.length).replaceAll('\\', '/');
  const html = readFileSync(file, 'utf8');

  // Redirect stubs emitted by astro.config.mjs `redirects` are not content
  // pages; the sitemap generator already excludes them too.
  if (/<meta http-equiv="refresh"/.test(html)) continue;

  // --- internal links (script contents stripped: client-side templates
  // like href="${entry.url}" are not real links) ---
  const htmlWithoutScripts = html.replace(SCRIPT_RE, '');
  for (const match of htmlWithoutScripts.matchAll(HREF_RE)) {
    const href = match[1];
    if (href === '' || href === '#') {
      emptyHrefs.push(`${rel}: href="${href}"`);
      continue;
    }
    if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
    if (href.startsWith('#')) continue;
    if (href.startsWith('//')) continue;
    if (resolveTarget(href) === null && !isSsrRoute(href)) {
      if (!brokenLinks.has(href)) brokenLinks.set(href, new Set());
      brokenLinks.get(href).add(rel);
    }
  }

  // --- JSON-LD validity ---
  for (const match of html.matchAll(JSONLD_RE)) {
    try {
      JSON.parse(match[1]);
    } catch (err) {
      jsonldErrors.push(`${rel}: ${err.message}`);
    }
  }

  // --- data JSON (e.g. the search index): must parse, and every url
  // inside it must resolve to a built page ---
  for (const match of html.matchAll(DATA_JSON_RE)) {
    try {
      const urls = [];
      collectUrls(JSON.parse(match[1]), urls);
      for (const url of urls) {
        if (resolveTarget(url) === null && !isSsrRoute(url)) {
          if (!brokenLinks.has(url)) brokenLinks.set(url, new Set());
          brokenLinks.get(url).add(`${rel} (data index)`);
        }
      }
    } catch (err) {
      jsonldErrors.push(`${rel}: data JSON: ${err.message}`);
    }
  }

  // --- exactly one h1 ---
  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (h1Count !== 1) h1Issues.push(`${rel}: ${h1Count} <h1> elements`);

  // --- title present and unique ---
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : null;
  if (!title) {
    titleIssues.push(`${rel}: missing <title>`);
  } else {
    if (!titles.has(title)) titles.set(title, new Set());
    titles.get(title).add(rel);
  }

  // --- meta description present and unique ---
  const descMatch = html.match(
    /<meta name="description" content="([^"]*)"/,
  );
  if (!descMatch || !descMatch[1].trim()) {
    missingDescriptions.push(rel);
  } else {
    if (!descriptions.has(descMatch[1]))
      descriptions.set(descMatch[1], new Set());
    descriptions.get(descMatch[1]).add(rel);
  }
}

// --- aggregate report ---
let failures = 0;

if (brokenLinks.size > 0) {
  failures++;
  console.error(`\nBROKEN INTERNAL LINKS (${brokenLinks.size}):`);
  for (const [target, referrers] of [...brokenLinks.entries()].sort()) {
    console.error(`  ${target}`);
    for (const ref of referrers) console.error(`    linked from ${ref}`);
  }
}

if (jsonldErrors.length > 0) {
  failures++;
  console.error(`\nINVALID JSON-LD (${jsonldErrors.length}):`);
  for (const e of jsonldErrors) console.error(`  ${e}`);
}

if (h1Issues.length > 0) {
  failures++;
  console.error(`\nPAGES WITHOUT EXACTLY ONE <h1> (${h1Issues.length}):`);
  for (const issue of h1Issues) console.error(`  ${issue}`);
}

if (titleIssues.length > 0) {
  failures++;
  console.error(`\nTITLE PROBLEMS (${titleIssues.length}):`);
  for (const issue of titleIssues) console.error(`  ${issue}`);
}

const duplicateTitles = [...titles.entries()].filter(([, pages]) => pages.size > 1);
if (duplicateTitles.length > 0) {
  failures++;
  console.error(`\nDUPLICATE TITLES (${duplicateTitles.length}):`);
  for (const [title, pages] of duplicateTitles)
    console.error(`  "${title}"\n    ${[...pages].join('\n    ')}`);
}

if (missingDescriptions.length > 0) {
  failures++;
  console.error(`\nMISSING META DESCRIPTION (${missingDescriptions.length}):`);
  for (const rel of missingDescriptions) console.error(`  ${rel}`);
}

const duplicateDescriptions = [...descriptions.entries()].filter(
  ([, pages]) => pages.size > 1,
);
if (duplicateDescriptions.length > 0) {
  failures++;
  console.error(
    `\nDUPLICATE META DESCRIPTIONS (${duplicateDescriptions.length}):`,
  );
  for (const [desc, pages] of duplicateDescriptions)
    console.error(
      `  "${desc.slice(0, 80)}..."\n    ${[...pages].join('\n    ')}`,
    );
}

if (emptyHrefs.length > 0) {
  failures++;
  console.error(`\nEMPTY HREFS (${emptyHrefs.length}):`);
  for (const h of emptyHrefs) console.error(`  ${h}`);
}

// The sitemap is an SSR route (src/pages/sitemap.xml.ts) that includes D1
// content, so only static assets are asserted here.
for (const mustExist of ['robots.txt']) {
  if (!existsSync(join(distDir, mustExist))) {
    failures++;
    console.error(`\nMISSING: dist/${mustExist}`);
  }
}

if (failures === 0) {
  console.log(
    `OK: ${files.length} pages audited — links, JSON-LD, H1s, titles, descriptions all clean.`,
  );
} else {
  console.error(`\n${failures} audit section(s) failed.`);
  process.exitCode = 1;
}
