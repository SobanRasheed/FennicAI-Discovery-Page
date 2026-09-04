/**
 * Global CMS search (§12).
 * GET /api/search/?q=&status=&subjectId=&authorId=&type=&since=&page=
 */
import type { APIRoute } from 'astro';
import { json, jsonError, HttpError } from '../../utils/backend';
import { requirePermission } from '../../utils/auth';
import { cmsSearch } from '../../utils/search';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'articles:read');
    const num = (key: string): number | undefined => {
      const v = url.searchParams.get(key);
      return v && /^\d+$/.test(v) ? Number(v) : undefined;
    };
    const type = url.searchParams.get('type');
    const result = await cmsSearch(locals, {
      q: url.searchParams.get('q') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      subjectId: num('subjectId'),
      authorId: num('authorId'),
      contentType:
        type === 'article' || type === 'study-note' || type === 'mcq' || type === 'subject' || type === 'topic'
          ? type
          : undefined,
      since: url.searchParams.get('since') ?? undefined,
      page: num('page'),
    });
    return json(result);
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
