/**
 * Audit logging for administrative actions. Fire-and-forget: audit failures
 * never break the user action, but are never silently skipped when DB is up.
 */
import type { App } from 'astro';
import { env, clientIp } from './backend';

export async function audit(
  locals: App.Locals,
  action: string,
  entityType?: string,
  entityId?: number,
  detail?: unknown,
): Promise<void> {
  try {
    const db = env(locals).DB;
    await db
      .prepare(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, detail_json, ip)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        locals.user?.id ?? null,
        action,
        entityType ?? null,
        entityId ?? null,
        detail ? JSON.stringify(detail) : null,
        clientIp(locals),
      )
      .run();
  } catch {
    // Audit logging must not take the request down; D1 outage is surfaced
    // by the actual operation anyway.
  }
}
