/**
 * POST /api/auth/logout/ — destroys the session, clears the cookie.
 */
import type { APIRoute } from 'astro';
import { destroySession, clearSessionCookie } from '../../../utils/auth';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    await destroySession(locals);
  } catch {
    // Session already gone.
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': clearSessionCookie(),
    },
  });
};
