/**
 * References API (§10).
 * GET  /api/references/  — list (searchable)
 * POST /api/references/  — create a reusable structured reference
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, referenceInputSchema } from '../../../utils/validate';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'references:read');
    const db = env(locals).DB;
    const q = url.searchParams.get('q');
    const rows = q
      ? await db
          .prepare(
            `SELECT * FROM "references" WHERE LOWER(title) LIKE ? OR LOWER(authors) LIKE ? OR LOWER(source) LIKE ? ORDER BY id DESC LIMIT 50`,
          )
          .bind(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`)
          .all<Record<string, unknown>>()
      : await db.prepare(`SELECT * FROM "references" ORDER BY id DESC LIMIT 50`).all<Record<string, unknown>>();
    return json({ references: rows.results });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requirePermission(locals, 'references:write');
    assertCsrf(locals);
    const input = await parseBody(request, referenceInputSchema);
    const result = await env(locals)
      .DB.prepare(
        `INSERT INTO "references" (ref_type, title, authors, source, year, edition, url, doi, accessed_at, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.refType,
        input.title,
        input.authors,
        input.source,
        input.year ?? null,
        input.edition,
        input.url ?? null,
        input.doi,
        input.accessedAt,
        input.notes,
        user.id,
      )
      .run();
    const id = result.meta?.last_row_id as number;
    await audit(locals, 'reference.create', 'reference', id, { title: input.title });
    return json({ id }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
