import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Notes, blog posts, and practice questions live in D1 (the admin CMS at
// /admin/) and render as on-demand SSR pages. The file-based collections
// below are static taxonomy and persona data only.

// ---------------------------------------------------------------------------
// Subject hub pages
// URL: /subjects/[slug]/
// ---------------------------------------------------------------------------
const subjects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/subjects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    introduction: z.string(), // subject page intro paragraph
    // Canonical chapter taxonomy for this subject. Notes reference these slugs.
    chapters: z
      .array(
        z.object({
          slug: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .default([]),
    // Exams / boards this subject maps to (display only).
    exams: z.array(z.string()).default([]),
    importantConcepts: z.array(z.string()).default([]),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
  }),
});

// ---------------------------------------------------------------------------
// Topic hub pages (topical authority connectors)
// URL: /topics/[slug]/
// ---------------------------------------------------------------------------
const topics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    beginnerExplanation: z.string(), // plain-language explanation section
    relatedConcepts: z.array(z.string()).default([]), // other topic slugs
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
  }),
});

// ---------------------------------------------------------------------------
// Education levels (grade/class/course/exam groupings)
// URL: /levels/[slug]/
// ---------------------------------------------------------------------------
const levels = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/levels' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    introduction: z.string(),
    // "Class 12", "BS Computer Science", "Semester 1", etc.
    kind: z.enum(['class', 'course', 'exam']),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
  }),
});

// ---------------------------------------------------------------------------
// Authors
// URL: /authors/[slug]/
// ---------------------------------------------------------------------------
const authors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: z.object({
    title: z.string(), // display name
    role: z.string(),
    bio: z.string(),
    expertise: z.array(z.string()).default([]),
    credentials: z.array(z.string()).default([]),
  }),
});

export const collections = {
  subjects,
  topics,
  levels,
  authors,
};
