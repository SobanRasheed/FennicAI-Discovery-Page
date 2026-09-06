-- 0004: CMS additions for the single-source-of-truth rewiring.
-- - articles.category: blog organization for article_type='article'
--   ('study-techniques' | 'exam-preparation' | 'subject-guides', NULL = uncategorized)
-- - mcqs.slug: stable public URL for per-question pages (/practice/[slug]/)
-- - mcqs.level: education level slug (e.g. 'first-professional-mbbs') for
--   the /practice/level/[level]/ browsing pages.
--
-- ALTER TABLE cannot add a CHECK constraint in SQLite, so category and
-- level are validated in the API/admin form layer, not the schema.

ALTER TABLE articles ADD COLUMN category TEXT;

ALTER TABLE mcqs ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcqs_slug ON mcqs(slug);

ALTER TABLE mcqs ADD COLUMN level TEXT;
