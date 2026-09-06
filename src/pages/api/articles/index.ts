/**
 * Article CMS API.
 * GET  /api/articles/           — list with filters (§3, §12)
 * POST /api/articles/           — create (draft or specified status)
 */
import type { APIRoute } from 'astro';
import { json, jsonError, env, HttpError } from '../../../utils/backend';
import { assertCsrf, requirePermission } from '../../../utils/auth';
import { parseBody, articleInputSchema } from '../../../utils/validate';
import { listArticles, saveArticleContent, replaceTags, replaceRelated, replaceArticleReferences } from '../../../utils/content';
import { renderTiptapDoc, readingMinutes } from '../../../utils/richtext';
import { audit } from '../../../utils/audit';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    requirePermission(locals, 'articles:read');
    const num = (key: string): number | undefined => {
      const v = url.searchParams.get(key);
      return v && /^\d+$/.test(v) ? Number(v) : undefined;
    };
    const result = await listArticles(locals, {
      status: url.searchParams.get('status') ?? undefined,
      subjectId: num('subjectId'),
      authorId: num('authorId'),
      articleType: url.searchParams.get('type') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      sort: (url.searchParams.get('sort') as 'updated' | 'published' | 'title') ?? undefined,
      page: num('page'),
      perPage: num('perPage'),
    });
    return json(result);
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = requirePermission(locals, 'articles:write');
    assertCsrf(locals);
    const input = await parseBody(request, articleInputSchema);

    const db = env(locals).DB;

    // Uniqueness: subject+slug must not collide with any non-deleted article.
    const collision = await db
      .prepare(
        `SELECT id FROM articles WHERE subject_id IS ? AND slug = ? AND status != 'deleted'`,
      )
      .bind(input.subjectId ?? null, input.slug)
      .first<{ id: number }>();
    if (collision) {
      throw new HttpError(409, 'An article with this slug already exists under that subject.');
    }

    const contentHtml = input.contentJson ? renderTiptapDoc(input.contentJson) : '';
    const minutes = input.contentJson ? readingMinutes(input.contentJson) : 1;

    const result = await db
      .prepare(
        `INSERT INTO articles
           (title, slug, excerpt, content_json, content_html, article_type, category,
            status, subject_id, topic_id, author_id, featured_media_id, scheduled_at,
            seo_title, meta_description, canonical_url, og_title, og_description,
            og_image_media_id, robots, reading_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.title,
        input.slug,
        input.excerpt,
        input.contentJson ? JSON.stringify(input.contentJson) : null,
        contentHtml,
        input.articleType,
        // Categories only organize blog articles, never study notes.
        input.articleType === 'article' ? input.category : null,
        input.subjectId ?? null,
        input.topicId ?? null,
        input.authorId ?? user.id,
        input.featuredMediaId ?? null,
        input.scheduledAt ?? null,
        input.seoTitle ?? null,
        input.metaDescription ?? null,
        input.canonicalUrl ?? null,
        input.ogTitle ?? null,
        input.ogDescription ?? null,
        input.ogImageMediaId ?? null,
        input.robots,
        minutes,
      )
      .run();
    const id = result.meta?.last_row_id as number;

    await replaceTags(locals, id, input.tagNames);
    await replaceRelated(locals, id, input.relatedArticleIds);
    await replaceArticleReferences(locals, id, input.referenceIds);
    await audit(locals, 'article.create', 'article', id, { title: input.title });

    return json({ id }, { status: 201 });
  } catch (err) {
    return jsonError((err as HttpError).status ?? 500, (err as Error).message);
  }
};
