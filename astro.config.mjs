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
  // Dev-only fix: the Cloudflare adapter pre-bundles `astro/app/entrypoint/dev`
  // for the workerd dev runner. That pre-bundled copy inlines a second module
  // instance of Astro's environment registry, so the dev app's
  // `setEnvironment()` call writes to a different WeakMap than the one the
  // render pipeline reads — it then falls back to the production environment,
  // whose pageMap only holds `prerender: false` routes, and every prerendered
  // page 500s with "unable to find a component instance". Excluding the entry
  // point from pre-bundling keeps all Astro core modules as one instance.
  vite: {
    optimizeDeps: {
      exclude: ['astro/app/entrypoint/dev'],
    },
  },
  // Build-time redirects (HTML refresh pages for prerendered routes).
  redirects: {
    '/blog/tags/api': '/blog/category/api-design',
    '/notes/index.php': '/notes/',
  },
});
