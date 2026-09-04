/**
 * Validation helpers shared by all API endpoints. Every create/update/
 * delete is validated server-side here, independent of the admin frontend.
 */
import { z } from 'astro/zod';

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required.')
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, digits, and single hyphens.');

export const articleStatusSchema = z.enum([
  'draft',
  'review',
  'scheduled',
  'published',
  'unpublished',
  'deleted',
]);

export const mcqStatusSchema = z.enum(['draft', 'published', 'unpublished', 'deleted']);

export const refTypeSchema = z.enum([
  'textbook',
  'journal',
  'guideline',
  'organization',
  'educational',
]);

export const articleInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300),
  slug: slugSchema,
  excerpt: z.string().max(400).default(''),
  articleType: z.enum(['article', 'study-note']).default('article'),
  contentJson: z.record(z.string(), z.unknown()).nullable().default(null),
  subjectId: z.number().int().positive().nullable(),
  topicId: z.number().int().positive().nullable(),
  authorId: z.number().int().positive().nullable(),
  featuredMediaId: z.number().int().positive().nullable(),
  tagNames: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  relatedArticleIds: z.array(z.number().int().positive()).max(20).default([]),
  referenceIds: z.array(z.number().int().positive()).max(50).default([]),
  seoTitle: z.string().max(200).nullable().default(null),
  metaDescription: z.string().max(300).nullable().default(null),
  canonicalUrl: z.string().url().nullable().default(null),
  ogTitle: z.string().max(200).nullable().default(null),
  ogDescription: z.string().max(300).nullable().default(null),
  ogImageMediaId: z.number().int().positive().nullable().default(null),
  robots: z
    .string()
    .regex(/^(index|noindex),(follow|nofollow)$/)
    .default('index,follow'),
  scheduledAt: z.string().datetime().nullable().default(null),
  status: articleStatusSchema.optional(),
});

export const mcqInputSchema = z.object({
  question: z.string().trim().min(1, 'Question is required.').max(1000),
  explanation: z.string().max(6000).default(''),
  status: mcqStatusSchema.optional(),
  subjectId: z.number().int().positive().nullable(),
  topicId: z.number().int().positive().nullable(),
  articleId: z.number().int().positive().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  tagNames: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(3),
        text: z.string().trim().min(1, 'Option text is required.').max(1000),
        isCorrect: z.boolean(),
      }),
    )
    .min(2, 'An MCQ needs at least 2 options.')
    .max(10),
});

export const subjectInputSchema = z.object({
  title: z.string().trim().min(1).max(150),
  slug: slugSchema,
  description: z.string().max(400).default(''),
  introduction: z.string().max(4000).default(''),
  imageMediaId: z.number().int().positive().nullable(),
  seoTitle: z.string().max(200).nullable(),
  seoDescription: z.string().max(300).nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const topicInputSchema = z.object({
  subjectId: z.number().int().positive(),
  parentTopicId: z.number().int().positive().nullable(),
  title: z.string().trim().min(1).max(150),
  slug: slugSchema,
  description: z.string().max(400).default(''),
  sortOrder: z.number().int().min(0).default(0),
});

export const referenceInputSchema = z.object({
  refType: refTypeSchema.default('textbook'),
  title: z.string().trim().min(1, 'Title is required.').max(400),
  authors: z.string().max(400).default(''),
  source: z.string().max(200).default(''),
  year: z.string().regex(/^\d{4}$/).nullable().default(null),
  edition: z.string().max(50).default(''),
  url: z.string().url().nullable().default(null),
  doi: z.string().max(100).default(''),
  accessedAt: z.string().max(30).default(''),
  notes: z.string().max(1000).default(''),
});

export const mediaUpdateSchema = z.object({
  altText: z.string().max(500).default(''),
  title: z.string().max(200).nullable().default(null),
  caption: z.string().max(600).nullable().default(null),
});

export const ALLOWED_MEDIA_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB

/** Parse + validate a JSON request body, or throw a 400 HttpError. */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new (await import('./backend')).HttpError(400, 'Request body must be JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new (await import('./backend')).HttpError(
      400,
      `${first.path.join('.') || 'body'}: ${first.message}`,
    );
  }
  return result.data;
}
