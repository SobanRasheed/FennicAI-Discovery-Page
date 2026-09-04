/**
 * Creates (or resets) the bootstrap admin user from the secrets
 * ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD, or from CLI arguments:
 *
 *   node scripts/seed-admin.mjs [email] [password]
 *
 * Run after `wrangler d1 migrations apply` (locally it uses the local D1
 * copy via wrangler; remotely pass --remote and D1 binding env vars).
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const email = args[0] || process.env.ADMIN_INITIAL_EMAIL;
const password = args[1] || process.env.ADMIN_INITIAL_PASSWORD;

if (!email || !password) {
  console.error(
    'Usage: node scripts/seed-admin.mjs <email> <password>\n' +
      '   or: set ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD',
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

// PBKDF2-SHA256 with the same parameters as src/utils/auth.ts.
const iterations = 100_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveBits'],
);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
  key,
  256,
);
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const hash = `pbkdf2$${iterations}$${toHex(salt.buffer)}$${toHex(bits)}`;

const username = email.split('@')[0].toLowerCase();
const sql = `
INSERT INTO users (email, username, display_name, password_hash, role_id)
VALUES ('${email.replace(/'/g, "''")}', '${username.replace(/'/g, "''")}', 'Administrator', '${hash}',
        (SELECT id FROM roles WHERE slug = 'admin'))
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  is_active = 1,
  updated_at = datetime('now');
`;

const remote = args.includes('--remote');
try {
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'medical-study-notes', '--local', '--command', sql, ...(remote ? ['--remote'] : [])],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  console.log(`Admin user ready: ${email}`);
} catch (err) {
  console.error('Failed to seed admin user. Apply migrations first:', err.message);
  process.exit(1);
}
