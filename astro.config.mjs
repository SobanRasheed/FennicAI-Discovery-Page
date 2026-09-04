// @ts-check
import { defineConfig } from 'astro/config';
import rehypeSlug from './src/plugins/rehype-slug-local.mjs';

// @astrojs/sitemap is replaced by scripts/generate-sitemap.mjs (run after
// build) until it can be installed; the sitemap URLs are derived directly
// from dist/ so they always match what was emitted.
export default defineConfig({
  site: 'https://devsyllabus.com',
  trailingSlash: 'always',
  markdown: {
    // Adds stable ids to headings so table-of-contents links work.
    rehypePlugins: [rehypeSlug],
  },
  // 301-style redirect map (static builds emit meta-refresh pages; a
  // deployment platform adapter converts these to server-level 301s).
  redirects: {
    '/blog/tags/api': '/blog/category/api-design',
    '/notes/index.php': '/notes/',
  },
});
