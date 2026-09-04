/// <reference types="astro/client" />

// Minimal structural types for the Cloudflare Workers runtime bindings.
// Full @cloudflare/workers-types is not required to build; these describe
// exactly what the code in src/ uses.
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<{ results: T[]; success: boolean }[]>;
  exec(query: string): Promise<unknown>;
  dump(): Promise<ArrayBuffer>;
}
interface R2ObjectBody {
  body: ReadableStream;
  bodyUsed: boolean;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata(headers: Headers): void;
}
interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string | Blob, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options?: Record<string, unknown>): Promise<{ objects: unknown[]; truncated: boolean }>;
}

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  SITE_URL: string;
  // Secrets, set via `wrangler secret put` — never committed.
  ADMIN_INITIAL_EMAIL?: string;
  ADMIN_INITIAL_PASSWORD?: string;
}

declare namespace App {
  interface Locals {
    /** Set by middleware so request-scoped helpers (client IP, user agent) can read it. */
    request?: Request;
    user: import('./utils/auth').SessionUser | null;
    csrfToken: string | null;
  }
}
