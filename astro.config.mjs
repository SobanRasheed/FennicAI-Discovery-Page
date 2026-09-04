// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Medical Study Notes: the public site is prerendered (static) by default
// for speed and crawlability — no page changes needed. Routes that need D1
// or auth (/admin, /api, /[subject]/[slug]/, /media/*, sitemap) opt out
// individually with `export const prerender = false` and render on-demand
// on Cloudflare Workers with D1 (content) and R2 (media) bindings.
export default defineConfig({
  site: 'https://devsyllabus.com',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: {
      enabled: true,
    },
  }),
  trailingSlash: 'always',
  markdown: {},
  // Build-time redirects (HTML refresh pages for prerendered routes).
  redirects: {
    '/blog/tags/api': '/blog/category/api-design',
    '/notes/index.php': '/notes/',
  },
});
