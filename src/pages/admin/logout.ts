/**
 * POST /admin/logout/ — form-post logout (no-JS friendly).
 */
import { destroySession, clearSessionCookie } from '../../utils/auth';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ locals }) => {
  try {
    await destroySession(locals);
  } catch {
    // already logged out
  }
  return new Response(null, {
    status: 303,
    headers: { 'set-cookie': clearSessionCookie(), location: '/admin/login/' },
  });
};
