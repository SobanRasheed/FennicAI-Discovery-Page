// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Medical Study Notes: the public site is prerendered (static) by default
// for speed and crawlability — no page changes needed. Routes that need D1
// or auth (/admin, /api, /[subject]/[slug]/, /media/*, sitemap) opt out
// individually with `export const prerender = false` and render on-demand
// on Cloudflare Workers with D1 (content) and R2 (media) bindings.
//
// NOTE: the config must be a static object, not a function — Astro 7 does
// not call a function-form top-level config and silently drops everything.
export default defineConfig({
  site: 'https://medicalstudynotes.tech',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: {
      enabled: true,
    },
    // Dev-only: prerendered routes in `astro dev` are served through Astro's
    // Node dev environment instead of the workerd runner (the runner's app
    // falls back to the production render environment, whose pageMap only
    // holds `prerender: false` routes, so prerendered pages 404). The Node
    // prerender middleware handles prerendered paths before the request
    // reaches the runner; SSR routes (admin/API/D1/R2) still run in workerd
    // with real bindings. Production builds keep the default workerd
    // prerenderer, which works correctly there.
    prerenderEnvironment: 'node',
  }),
  trailingSlash: 'always',
  markdown: {},
  // Build-time redirects (HTML refresh pages for prerendered routes).
  redirects: {
    '/blog/tags/api': '/blog/category/api-design',
    '/notes/index.php': '/notes/',
  },
});
