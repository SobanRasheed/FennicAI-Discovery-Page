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
 *
 * Notes, blog posts, and practice questions moved to D1 (the admin CMS); the
 * file-based collections that remain — subjects, levels, topics, authors —
 * are static taxonomy/guide data only.
 */
export async function getCollection(name: Parameters<typeof astroGetCollection>[0]) {
  const entries = await astroGetCollection(name);
  return entries.map((entry) => withSlug(entry));
}

export type Subject = CollectionEntry<'subjects'> & { slug: string };
export type Topic = CollectionEntry<'topics'> & { slug: string };
export type Level = CollectionEntry<'levels'> & { slug: string };
export type Author = CollectionEntry<'authors'> & { slug: string };

/** Isolated date formatting so every page renders dates identically. */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ISO 8601 datetime for JSON-LD dateModified/datePublished. */
export function isoDate(date: Date): string {
  return date.toISOString();
}
