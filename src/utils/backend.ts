/**
 * Shared server-side backend utilities for the Medical Study Notes CMS.
 * Everything here runs on the Worker only — no secrets reach the browser.
 */
import type { App } from 'astro';

export type Env = App.Locals extends { runtime?: { env: infer E } } ? E : never;

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

export function env(locals: App.Locals): Env {
  const runtime = locals.runtime;
  if (!runtime?.env?.DB) {
    throw new HttpError(500, 'Server bindings unavailable (D1 is not configured).');
  }
  return runtime.env;
}

/** Client IP for rate limiting / audit logging (best effort). */
export function clientIp(locals: App.Locals): string {
  const cf = locals.runtime?.cf as { connectingIp?: string } | undefined;
  return cf?.connectingIp ?? 'unknown';
}
