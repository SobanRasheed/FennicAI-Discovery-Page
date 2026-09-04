// @ts-check
import { defineConfig } from 'astro/config';

// @astrojs/sitemap is replaced by scripts/generate-sitemap.mjs (run after
// build) until it can be installed; the sitemap URLs are derived directly
// from dist/ so they always match what was emitted.
// Heading ids for TOC anchors are provided natively by Astro 7's default
// markdown processor (Sätteri's heading-ids plugin), so no rehype plugin
// is needed.
export default defineConfig({
  site: 'https://devsyllabus.com',
  trailingSlash: 'always',
  markdown: {},
  // 301-style redirect map (static builds emit meta-refresh pages; a
  // deployment platform adapter converts these to server-level 301s).
  redirects: {
    '/blog/tags/api': '/blog/category/api-design',
    '/notes/index.php': '/notes/',
  },
});
