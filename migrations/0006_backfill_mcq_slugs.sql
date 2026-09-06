-- 0006: backfill slugs on the 0003-seeded MCQs so every published question is
-- reachable at /practice/[slug]/. Idempotent single-row UPDATEs.
UPDATE mcqs SET slug = 'brachial-plexus-upper-trunk' WHERE id = 1 AND slug IS NULL;
UPDATE mcqs SET slug = 'gram-positive-cell-wall-unique-component' WHERE id = 2 AND slug IS NULL;
UPDATE mcqs SET slug = 'catalase-test-genera' WHERE id = 3 AND slug IS NULL;
UPDATE mcqs SET slug = 'abducens-nerve-abduction-loss' WHERE id = 4 AND slug IS NULL;
UPDATE mcqs SET slug = 'hypoglossal-nerve-tongue-deviation' WHERE id = 5 AND slug IS NULL;
UPDATE mcqs SET slug = 'first-heart-sound-valve-closure' WHERE id = 6 AND slug IS NULL;
UPDATE mcqs SET slug = 'cardiac-cycle-shortened-phase' WHERE id = 7 AND slug IS NULL;
UPDATE mcqs SET slug = 'fluoroquinolone-dna-gyrase' WHERE id = 8 AND slug IS NULL;
UPDATE mcqs SET slug = 'aminoglycoside-toxicity-class' WHERE id = 9 AND slug IS NULL;
