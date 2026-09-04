/**
 * GET /api/auth/session/ — current user + CSRF token for the admin frontend.
 */
import type { APIRoute } from 'astro';
import { json } from '../../../utils/backend';

export const prerender = false;

export const GET: APIRoute = ({ locals }) => {
  return json({
    user: locals.user
      ? {
          id: locals.user.id,
          email: locals.user.email,
          displayName: locals.user.displayName,
          role: locals.user.roleSlug,
        }
      : null,
    csrfToken: locals.csrfToken ?? null,
  });
};
