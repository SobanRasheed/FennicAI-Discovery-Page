/**
 * Shared server-side backend utilities for the Medical Study Notes CMS.
 * Everything here runs on the Worker only — no secrets reach the browser.
 */
import type { App } from 'astro';

export interface Locals extends App.Locals {}

/** Thrown by service functions; converted to an HTTP status + message. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const json = (data: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init?.headers ?? {}),
    },
  });

export const jsonError = (status: number, message: string): Response =>
  json({ error: message }, { status });

// --- Cloudflare bindings -------------------------------------------------
// `Astro.locals.runtime.env` was removed in Astro v6+; the supported access
// is `import { env } from 'cloudflare:workers'`. That module only exists
// inside the Workers runtime, so it is imported dynamically once per process
// and cached here. During Node-side prerendering (`astro build`) the import
// fails and the bindings simply stay unavailable — every code path that
// needs D1/R2 only ever runs on the Worker.
let cachedEnv: Env | undefined;

/** Resolve the Worker bindings once per process. Safe to call repeatedly. */
export async function loadBindings(): Promise<void> {
  if (cachedEnv) return;
  try {
    const mod = (await import('cloudflare:workers')) as { env: Env };
    cachedEnv = mod.env;
  } catch {
    cachedEnv = undefined;
  }
}

/** True once the Workers env has been resolved and D1 is bound. */
export function bindingsReady(): boolean {
  return Boolean(cachedEnv?.DB);
}

/** The Worker's bindings (D1 as .DB, R2 as .MEDIA, vars/secrets). */
export function env(_locals: App.Locals): Env {
  if (!cachedEnv?.DB) {
    throw new HttpError(500, 'Server bindings unavailable (D1 is not configured).');
  }
  return cachedEnv;
}

/** Client IP for rate limiting / audit logging (best effort). */
export function clientIp(locals: App.Locals): string {
  return locals.request?.headers.get('cf-connecting-ip') ?? 'unknown';
}
