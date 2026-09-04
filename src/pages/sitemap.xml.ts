/**
 * /sitemap.xml (§6) — dynamic sitemap from D1 published articles plus all
 * static routes. Cached at the edge like the pages it lists.
 */
import type { APIRoute } from 'astro';
import { listAllPublishedForSitemap, listSubjects } from '../utils/content';

export const prerender = false;

const STATIC_PATHS = [
  '/',
  '/blog/',
  '/notes/',
  '/practice/',
  '/subjects/',
  '/topics/',
  '/levels/',
  '/authors/',
  '/about/',
  '/editorial-policy/',
  '/faq/',
  '/resources/',
  '/contact/',
];

export const GET: APIRoute = async ({ locals, site }) => {
  const [articles, subjects] = await Promise.all([
    listAllPublishedForSitemap(locals).catch(() => [] as { loc: string; lastmod: string }[]),
    listSubjects(locals).catch(() => []),
  ]);

  const base = site?.toString() ?? 'https://devsyllabus.com/';
  const now = new Date().toISOString().slice(0, 10);

  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: p, lastmod: now, priority: p === '/' ? '1.0' : '0.8' })),
    ...subjects.map((s) => ({ loc: `/${s.slug}/`, lastmod: (s as unknown as { updated_at?: string }).updated_at?.slice(0, 10) || now, priority: '0.7' })),
    ...articles.map((a) => ({ loc: a.loc, lastmod: a.lastmod || now, priority: '0.6' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${base.replace(/\/$/, '')}${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
