import { getCollection as astroGetCollection, type CollectionEntry } from 'astro:content';

/**
 * Content-layer entries identify themselves by `id` (the file name without
 * extension). Pages and components uniformly link with `entry.slug`, so every
 * helper attaches it here, once. The id is flattened so a file nested in a
 * subfolder can never leak a "/" into a URL param.
 */
function withSlug<T extends { id: string }>(entry: T): T & { slug: string } {
  return { ...entry, slug: entry.id.split('/').pop() ?? entry.id };
}

/**
 * Drop-in replacement for astro:content's getCollection that returns
 * slug-attaching entries. Pages import this from utils/collections instead.
 */
export async function getCollection(name: Parameters<typeof astroGetCollection>[0]) {
  const entries = await astroGetCollection(name);
  return entries.map((entry) => withSlug(entry));
}

export type Note = CollectionEntry<'notes'> & { slug: string };
export type BlogPost = CollectionEntry<'blog'> & { slug: string };
export type Question = CollectionEntry<'questions'> & { slug: string };
export type Subject = CollectionEntry<'subjects'> & { slug: string };
export type Topic = CollectionEntry<'topics'> & { slug: string };
export type Level = CollectionEntry<'levels'> & { slug: string };
export type Author = CollectionEntry<'authors'> & { slug: string };

/** Notes are ordered by chapter first so hub pages group related material. */
export async function getNotes(): Promise<Note[]> {
  const notes = await astroGetCollection('notes', ({ data }) => !data.draft);
  return notes.map(withSlug).sort(
    (a, b) =>
      a.data.subject.localeCompare(b.data.subject) ||
      a.data.chapter.localeCompare(b.data.chapter) ||
      a.data.title.localeCompare(b.data.title),
  );
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts = await astroGetCollection('blog', ({ data }) => !data.draft);
  return posts
    .map(withSlug)
    .sort((a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf());
}

export async function getQuestions(): Promise<Question[]> {
  const questions = await astroGetCollection('questions');
  return questions.map(withSlug);
}

/** All content referencing a topic slug — powers topic hub pages. */
export async function getContentByTopic(topic: string) {
  const [notes, posts, questions] = await Promise.all([
    getNotes(),
    getBlogPosts(),
    getQuestions(),
  ]);
  return {
    notes: notes.filter((n) => n.data.topics.includes(topic)),
    posts: posts.filter((p) => p.data.topics.includes(topic)),
    questions: questions.filter((q) => q.data.topics.includes(topic)),
  };
}

/** Notes belonging to a subject, grouped by the subject's chapter taxonomy. */
export async function getNotesBySubject(
  subjectSlug: string,
  chapters: { slug: string; title: string; description: string }[],
) {
  const notes = (await getNotes()).filter((n) => n.data.subject === subjectSlug);
  const grouped = chapters.map((chapter) => ({
    chapter,
    notes: notes.filter((n) => n.data.chapter === chapter.slug),
  }));
  const orphaned = notes.filter(
    (n) => !chapters.some((c) => c.slug === n.data.chapter),
  );
  if (orphaned.length > 0) {
    grouped.push({
      chapter: { slug: 'other', title: 'Additional Notes', description: '' },
      notes: orphaned,
    });
  }
  return grouped;
}

export async function getNotesByLevel(levelSlug: string): Promise<Note[]> {
  const notes = await getNotes();
  return notes.filter((n) => n.data.level === levelSlug);
}

export async function getQuestionsByLevel(levelSlug: string): Promise<Question[]> {
  const questions = await getQuestions();
  return questions.filter((q) => q.data.level === levelSlug);
}

/** Blog posts in a category, newest first. */
export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const posts = await getBlogPosts();
  return posts.filter((p) => p.data.category === category);
}

export async function getQuestionsBySubject(subjectSlug: string): Promise<Question[]> {
  const questions = await getQuestions();
  return questions.filter((q) => q.data.subject === subjectSlug);
}

export async function getNotesByTopic(topic: string): Promise<Note[]> {
  const notes = await getNotes();
  return notes.filter((n) => n.data.topics.includes(topic));
}

/** The distinct categories actually in use — avoids empty archive pages. */
export async function getBlogCategories(): Promise<string[]> {
  const posts = await getBlogPosts();
  return [...new Set(posts.map((p) => p.data.category))].sort();
}

/** Isolated date formatting so every page renders dates identically. */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO 8601 datetime for JSON-LD dateModified/datePublished. */
export function isoDate(date: Date): string {
  return date.toISOString();
}
