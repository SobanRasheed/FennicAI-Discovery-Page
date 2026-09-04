/**
 * POST /api/auth/login/ — { identifier, password } → session cookie.
 * Rate limited; failures are logged in auth_attempts.
 */
import type { APIRoute } from 'astro';
import { json, jsonError } from '../../../utils/backend';
import { login, sessionCookie } from '../../../utils/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === 'string' ? body.identifier : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!identifier || !password) {
      return jsonError(400, 'Email/username and password are required.');
    }
    const { user, token, expires } = await login(locals, identifier, password);
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.roleSlug,
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'set-cookie': sessionCookie(token, expires),
        },
      },
    );
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    return jsonError(status, (err as Error).message || 'Login failed.');
  }
};
