/**
 * Middleware: resolves the session on every request, guards /admin/* and
 * /api/* (401/redirect), applies D1-stored redirects, and promotes
 * scheduled articles that have reached their publication time.
 */
import { defineMiddleware } from 'astro:middleware';
import { resolveSession, ensureBootstrapAdmin } from './utils/auth';
import { findRedirect } from './utils/content';

const PUBLIC_API = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
]);

export const onRequest = defineMiddleware(
  async (context, next): Promise<Response> => {
    const { locals, url, request, redirect } = context;

    // Every request gets a resolved session (or null). Public pages never
    // need it, so failures here are non-fatal for them.
    try {
      await resolveSession(locals);
    } catch {
      locals.user = null;
    }

    const path = url.pathname.replace(/\/+$/, '') || '/';

    // --- D1 redirect map (slug changes on published articles) -----------
    // Skip admin/API/assets paths so the CMS itself never gets redirected.
    if (
      request.method === 'GET' &&
      !path.startsWith('/admin') &&
      !path.startsWith('/api') &&
      locals.runtime?.env?.DB &&
      !path.startsWith('/_') &&
      !path.match(/\.[a-z0-9]+$/)
    ) {
      try {
        const to = await findRedirect(locals, path);
        if (to) return redirect(to, 301);
      } catch {
        // D1 unavailable: fall through to normal rendering.
      }
    }

    // --- guard /admin/* ---------------------------------------------------
    // The login form handler must stay reachable pre-auth.
    if (path === '/admin/login-submit') {
      return next();
    }
    if (path === '/admin/login') {
      // Already signed in → straight to the dashboard.
      if (locals.user) return redirect('/admin/dashboard/');
      return next();
    }
    if (path.startsWith('/admin')) {
      if (!locals.user) return redirect('/admin/login/');
      // Bootstrap the initial admin (idempotent, secrets-driven).
      try {
        await ensureBootstrapAdmin(locals);
      } catch {
        // non-fatal
      }
      return next();
    }

    // --- guard /api/* -----------------------------------------------------
    if (path.startsWith('/api/')) {
      if (PUBLIC_API.has(path.replace(/\/$/, ''))) return next();
      if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Authentication required.' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      return next();
    }

    return next();
  },
);
