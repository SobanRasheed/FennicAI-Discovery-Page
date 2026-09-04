// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Medical Study Notes: the public site is prerendered (static) by default
// for speed and crawlability — no page changes needed. Routes that need D1
// or auth (/admin, /api, /[subject]/[slug]/, /media/*, sitemap) opt out
// individually with `export const prerender = false` and render on-demand
// on Cloudflare Workers with D1 (content) and R2 (media) bindings.
export default defineConfig(({ command }) => ({
  site: 'https://devsyllabus.com',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: {
      enabled: true,
    },
    // Dev-only: prerendered routes in `astro dev` are served through Astro's
    // Node dev environment instead of the workerd runner. The workerd runner's
    // app falls back to the production render environment, whose pageMap only
    // holds `prerender: false` routes — every prerendered page would 500 with
    // "unable to find a component instance". The Node prerender middleware
    // handles prerendered paths before the request ever reaches the runner;
    // SSR routes (admin/API/D1/R2) still run in workerd with real bindings.
    // Production builds keep the workerd prerenderer, which works correctly.
    ...(command === 'dev' ? { prerenderEnvironment: 'node' } : {}),
  }),
  trailingSlash: 'always',
  markdown: {},
  // Build-time redirects (HTML refresh pages for prerendered routes).
  redirects: {
    '/blog/tags/api': '/blog/category/api-design',
    '/notes/index.php': '/notes/',
  },
}));
