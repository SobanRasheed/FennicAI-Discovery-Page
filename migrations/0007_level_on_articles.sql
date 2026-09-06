-- ---------------------------------------------------------------------------
-- Level on articles: powers /levels/ hub pages. Notes carry the MBBS
-- professional level they belong to (mirrors mcqs.level). Backfills the
-- imported study notes from their source frontmatter.
-- ---------------------------------------------------------------------------

ALTER TABLE articles ADD COLUMN level TEXT;

UPDATE articles SET level = 'first-professional-mbbs'
 WHERE article_type = 'study-note'
   AND slug IN ('brachial-plexus', 'cardiac-cycle', 'glycolysis');

UPDATE articles SET level = 'second-professional-mbbs'
 WHERE article_type = 'study-note'
   AND slug IN ('autonomic-pharmacology', 'cell-injury', 'gram-positive-vs-gram-negative');

UPDATE articles SET level = 'third-professional-mbbs'
 WHERE article_type = 'study-note'
   AND slug IN ('asphyxia', 'incidence-vs-prevalence');
