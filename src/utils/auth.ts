/**
 * Authentication: PBKDF2 password hashing, opaque session tokens stored
 * SHA-256-hashed in D1, CSRF tokens, login rate limiting, and role-based
 * permission checks. Server-side only.
 */
import type { App } from 'astro';
import { HttpError, env, clientIp } from './backend';

export interface SessionUser {
  id: number;
  email: string;
  username: string;
  displayName: string;
  roleSlug: string;
  permissions: string[];
}

interface UserRow {
  id: number;
  email: string;
  username: string;
  display_name: string;
  password_hash: string;
  is_active: number;
  role_slug: string;
  permissions_json: string;
}

export const SESSION_COOKIE = 'msn_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const PBKDF2_ITERATIONS = 100_000;

// ---------------------------------------------------------------------------
// Password hashing (WebCrypto PBKDF2-SHA256, available on Workers)
// ---------------------------------------------------------------------------

const toHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer)}$${toHex(hash.buffer)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterations || !saltHex || !hashHex) return false;
  const hash = await pbkdf2(password, fromHex(saltHex), Number(iterations));
  return toHex(hash.buffer) === hashHex;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(digest);
};

export async function createSession(locals: App.Locals, userId: number): Promise<{ token: string; csrfToken: string; expires: Date }> {
  const db = env(locals).DB;
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const csrfToken = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db
    .prepare(
      `INSERT INTO sessions (user_id, token_hash, csrf_token, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(userId, tokenHash, csrfToken, expires.toISOString(), clientIp(locals), locals.request?.headers.get('user-agent') ?? '')
    .run();
  return { token, csrfToken, expires };
}

async function loadSessionUser(locals: App.Locals, token: string): Promise<{ user: SessionUser; csrfToken: string } | null> {
  const db = env(locals).DB;
  const tokenHash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT s.csrf_token, s.expires_at,
              u.id, u.email, u.username, u.display_name, u.is_active,
              r.slug AS role_slug, r.permissions_json
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
    .bind(tokenHash)
    .first<{
      csrf_token: string;
      expires_at: string;
      id: number;
      email: string;
      username: string;
      display_name: string;
      is_active: number;
      role_slug: string;
      permissions_json: string;
    }>();
  if (!row || !row.is_active) return null;
  return {
    user: {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      roleSlug: row.role_slug,
      permissions: JSON.parse(row.permissions_json) as string[],
    },
    csrfToken: row.csrf_token,
  };
}

export async function resolveSession(locals: App.Locals): Promise<void> {
  const cookie = locals.request?.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([a-f0-9]{64})`));
  if (!match) return;
  const found = await loadSessionUser(locals, match[1]);
  if (found) {
    locals.user = found.user;
    locals.csrfToken = found.csrfToken;
  }
}

export async function destroySession(locals: App.Locals): Promise<void> {
  const cookie = locals.request?.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([a-f0-9]{64})`));
  if (!match) return;
  const db = env(locals).DB;
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(match[1])).run();
}

export function sessionCookie(token: string, expires: Date): string {
  const secure = 'secure';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; ${secure}; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ---------------------------------------------------------------------------
// Permission checks
// ---------------------------------------------------------------------------

export function can(user: SessionUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.permissions.includes('*')) return true;
  // "articles:publish" is granted by "articles:*"; "*" covers everything.
  const [domain] = permission.split(':');
  return user.permissions.includes(permission) || user.permissions.includes(`${domain}:*`);
}

export function requireUser(locals: App.Locals): SessionUser {
  if (!locals.user) throw new HttpError(401, 'Authentication required.');
  return locals.user;
}

export function requirePermission(locals: App.Locals, permission: string): SessionUser {
  const user = requireUser(locals);
  if (!can(user, permission)) {
    throw new HttpError(403, `Requires ${permission} permission.`);
  }
  return user;
}

/** CSRF: mutating API calls must echo the session's token header. */
export function assertCsrf(locals: App.Locals): void {
  if (!locals.user) throw new HttpError(401, 'Authentication required.');
  const header = locals.request?.headers.get('x-csrf-token');
  if (!header || header !== locals.csrfToken) {
    throw new HttpError(403, 'CSRF token missing or invalid.');
  }
}

// ---------------------------------------------------------------------------
// Login + rate limiting
// ---------------------------------------------------------------------------

const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MINUTES = 15;

export async function login(
  locals: App.Locals,
  identifier: string,
  password: string,
): Promise<{ user: SessionUser; token: string; csrfToken: string; expires: Date }> {
  const db = env(locals).DB;
  const ip = clientIp(locals);

  // First-run convenience: create the initial admin from secrets if the
  // users table is still empty (otherwise nobody could ever sign in).
  await ensureBootstrapAdmin(locals);

  // Rate limit: 5 failures per identifier (or per IP) in the last 15 minutes.
  const { failures } = await db
    .prepare(
      `SELECT COUNT(*) AS failures FROM auth_attempts
       WHERE created_at > datetime('now', '-${LOGIN_WINDOW_MINUTES} minutes')
         AND (identifier = ? OR ip = ?) AND success = 0`,
    )
    .bind(identifier, ip)
    .first<{ failures: number }>();
  if (failures >= LOGIN_MAX_FAILURES) {
    throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
  }

  const ident = identifier.trim().toLowerCase();
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.username, u.display_name, u.password_hash, u.is_active,
              r.slug AS role_slug, r.permissions_json
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? OR u.username = ?`,
    )
    .bind(ident, ident)
    .first<UserRow>();

  const valid = row && row.is_active && (await verifyPassword(password, row.password_hash));
  await db
    .prepare('INSERT INTO auth_attempts (identifier, ip, success) VALUES (?, ?, ?)')
    .bind(identifier, ip, valid ? 1 : 0)
    .run();

  if (!row || !valid) throw new HttpError(401, 'Invalid email/username or password.');

  const { token, csrfToken, expires } = await createSession(locals, row.id);
  await db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').bind(row.id).run();
  await db
    .prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip) VALUES (?, ?, ?, ?, ?)')
    .bind(row.id, 'auth.login', 'user', row.id, ip)
    .run();

  return {
    user: {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      roleSlug: row.role_slug,
      permissions: JSON.parse(row.permissions_json) as string[],
    },
    token,
    csrfToken,
    expires,
  };
}

// ---------------------------------------------------------------------------
// Bootstrap: create the initial admin from secrets if no user exists yet.
// ---------------------------------------------------------------------------

export async function ensureBootstrapAdmin(locals: App.Locals): Promise<void> {
  const e = env(locals);
  if (!e.ADMIN_INITIAL_EMAIL || !e.ADMIN_INITIAL_PASSWORD) return;
  const db = e.DB;
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  if (existing?.n) return;
  const role = await db.prepare(`SELECT id FROM roles WHERE slug = 'admin'`).first<{ id: number }>();
  if (!role) return;
  const hash = await hashPassword(e.ADMIN_INITIAL_PASSWORD);
  const result = await db
    .prepare(
      `INSERT INTO users (email, username, display_name, password_hash, role_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(e.ADMIN_INITIAL_EMAIL, e.ADMIN_INITIAL_EMAIL.split('@')[0], 'Administrator', hash, role.id)
    .run();
  const userId = result.meta?.last_row_id as number | undefined;
  if (userId) {
    await db
      .prepare(`INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
      .bind(userId, 'auth.bootstrap', 'user', userId)
      .run();
  }
}
