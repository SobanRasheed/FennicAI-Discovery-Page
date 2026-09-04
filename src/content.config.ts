import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ---------------------------------------------------------------------------
// Blog posts
// URL: /blog/[slug]/
// Hierarchy: Home > Blog > Category > Topic > Article
// ---------------------------------------------------------------------------
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    // Overrides the H1/title when targeting a specific search intent.
    seoTitle: z.string().optional(),
    // Meta description, 140-160 chars. Also used for listing summaries.
    description: z.string().max(200),
    author: z.string(), // author slug
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    popular: z.boolean().default(false),
    // Category slug. Blog categories are flat, topic depth lives in /topics/.
    category: z.string(),
    // Topic slugs connecting the article into topical-authority hub pages.
    topics: z.array(z.string()).default([]),
    // Study-note slugs cross-linked in "Related study notes".
    relatedNotes: z.array(z.string()).default([]),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
    references: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url().optional(),
          source: z.string().optional(),
        }),
      )
      .default([]),
    noindex: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Study notes
// URL: /notes/[slug]/
// Hierarchy: Home > Level > Subject > Chapter > Topic > Note
// ---------------------------------------------------------------------------
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string().max(200), // meta description + short overview card
    overview: z.string(), // 1-2 sentence summary shown above the fold
    subject: z.string(), // subject slug
    level: z.string(), // education-level slug
    chapter: z.string(), // chapter slug, resolved against the subject
    topics: z.array(z.string()).default([]), // topic-hub slugs
    learningObjectives: z.array(z.string()).min(3),
    keyTerms: z
      .array(z.object({ term: z.string(), definition: z.string() }))
      .default([]),
    importantPoints: z.array(z.string()).default([]),
    // Formulas as { latex-ish expression, meaning } pairs, rendered in a
    // definition list. Keep math in plain notation for accessibility.
    formulas: z
      .array(z.object({ expression: z.string(), meaning: z.string() }))
      .default([]),
    summary: z.string(),
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),
    references: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url().optional(),
          source: z.string().optional(),
        }),
      )
      .default([]),
    author: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    popular: z.boolean().default(false),
    noindex: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

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

// ---------------------------------------------------------------------------
// Practice questions
// URL: /practice/ (index + question pages /practice/[slug]/)
// ---------------------------------------------------------------------------
const questions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/questions' }),
  schema: z.object({
    question: z.string(),
    type: z.enum(['mcq', 'short', 'long', 'numerical']),
    subject: z.string(),
    level: z.string(),
    chapter: z.string().optional(),
    topics: z.array(z.string()).default([]),
    // Exam-oriented tag: "Board exam 2024 pattern", "University midterm", etc.
    examTag: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    options: z.array(z.string()).default([]), // MCQ only
    answer: z.string(),
    explanation: z.string(),
    noindex: z.boolean().default(false),
  }),
});

export const collections = {
  blog,
  notes,
  subjects,
  topics,
  levels,
  authors,
  questions,
};
