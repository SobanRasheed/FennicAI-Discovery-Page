/**
 * POST /admin/login-submit/ — form-handler variant of the login API (works
 * without client-side JS). Redirects to the dashboard on success, back to
 * the form with an error otherwise.
 */
import { login, sessionCookie } from '../../utils/auth';

export const prerender = false;

export const POST: import('astro').APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData().catch(() => null);
  const identifier = String(form?.get('identifier') ?? '');
  const password = String(form?.get('password') ?? '');
  if (!identifier || !password) {
    return redirect('/admin/login/?error=Enter+your+email+and+password.', 303);
  }
  try {
    const { token, expires } = await login(locals, identifier, password);
    return new Response(null, {
      status: 303,
      headers: {
        'set-cookie': sessionCookie(token, expires),
        location: '/admin/dashboard/',
      },
    });
  } catch (err) {
    const message = encodeURIComponent((err as Error).message);
    return redirect(`/admin/login/?error=${message}`, 303);
  }
};
