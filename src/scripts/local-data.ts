/**
 * Client-side access to the two local stores the dashboard pages read: the
 * saved-items list (notes and articles bookmarked from their pages) and quiz
 * history (recorded when a quiz is finished). Both live in this browser's
 * localStorage only — nothing is ever sent to the server, which is why the
 * dashboard pages carry no account and are noindex.
 */

export interface SavedItem {
  slug: string;
  title: string;
  href: string;
}

export interface QuizResult {
  subject: string;
  subjectSlug: string;
  correct: number;
  total: number;
  pct: number;
  seconds: number;
  /** ISO timestamp of when the quiz was finished. */
  date: string;
}

const SAVED_KEY = 'msn:saved-articles';
const HISTORY_KEY = 'msn:quiz-history';

const read = <T>(key: string): T[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
};

export const readSaved = (): SavedItem[] => read<SavedItem>(SAVED_KEY);

export const readQuizHistory = (): QuizResult[] => read<QuizResult>(HISTORY_KEY);

export const removeSaved = (slug: string): SavedItem[] => {
  const remaining = readSaved().filter((item) => item.slug !== slug);
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(remaining));
  } catch {
    /* storage unavailable — the list just won't persist */
  }
  return remaining;
};

/** "12 Aug 2026" style date, in the visitor's locale. */
export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
