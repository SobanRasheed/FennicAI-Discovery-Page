import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;
export type BlogPost = CollectionEntry<'blog'>;
export type Question = CollectionEntry<'questions'>;

/** Notes are ordered by chapter first so hub pages group related material. */
export async function getNotes(): Promise<Note[]> {
  const notes = await getCollection('notes', ({ data }) => !data.draft);
  return notes.sort(
    (a, b) =>
      a.data.subject.localeCompare(b.data.subject) ||
      a.data.chapter.localeCompare(b.data.chapter) ||
      a.data.title.localeCompare(b.data.title),
  );
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort(
    (a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf(),
  );
}

export async function getQuestions(): Promise<Question[]> {
  return getCollection('questions');
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
