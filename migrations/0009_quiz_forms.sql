-- 0009: Google Form quiz links.
-- Quizzes the admin builds as Google Forms instead of authoring MCQs in the
-- in-house engine (which stays fully intact). Each row is a card on the
-- practice pages: title, topic, subject, thumbnail, and the external form
-- URL students are redirected to.

CREATE TABLE IF NOT EXISTS quiz_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  topic TEXT,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  google_form_url TEXT NOT NULL,
  media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_forms_subject ON quiz_forms(subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_forms_status ON quiz_forms(status);
