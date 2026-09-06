-- ---------------------------------------------------------------------------
-- Author persona slug on articles: powers /authors/ pages. D1 users are
-- login accounts; the public byline is the file-based author persona,
-- referenced by slug. Backfills the imported content from frontmatter.
-- ---------------------------------------------------------------------------

ALTER TABLE articles ADD COLUMN author_slug TEXT;

UPDATE articles SET author_slug = 'soban-rasheed'
 WHERE status = 'published' AND slug IN
   ('incidence-vs-prevalence', 'autonomic-pharmacology', 'active-recall-spaced-repetition');

UPDATE articles SET author_slug = 'mahnoor-tariq'
 WHERE status = 'published' AND slug IN
   ('gram-positive-vs-gram-negative', 'brachial-plexus', 'asphyxia', 'study-anatomy-first-year-mbbs');

UPDATE articles SET author_slug = 'bilal-ahmed'
 WHERE status = 'published' AND slug IN
   ('glycolysis', 'cell-injury', 'cardiac-cycle', 'pathology-mcq-mistakes');
