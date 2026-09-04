-- Medical Study Notes — initial schema (Cloudflare D1 / SQLite)
-- Content lives in D1; images/PDFs live in R2 and are referenced by key.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- JSON array of permission strings, e.g. ["articles:publish","mcqs:write"]
  permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  -- pbkdf2$iterations$saltHex$hashHex — computed with WebCrypto PBKDF2-SHA256
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  bio TEXT NOT NULL DEFAULT '',
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 hex of the opaque cookie token; the raw token never touches D1.
  token_hash TEXT NOT NULL UNIQUE,
  -- Random token returned to the admin frontend, echoed as X-CSRF-Token.
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- Login attempts power auth rate limiting and audit (failures per
-- identifier + IP within a rolling window).
CREATE TABLE auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_auth_attempts_lookup ON auth_attempts(identifier, created_at);

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------

CREATE TABLE subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  introduction TEXT NOT NULL DEFAULT '',
  image_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  -- Slug must be unique within its subject; URL is /<subject>/<topic>/.
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subject_id, slug)
);
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_topics_parent ON topics(parent_topic_id);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------------
-- Media (metadata only — bytes live in R2 under MEDIA binding)
-- ---------------------------------------------------------------------------

CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- R2 object key, e.g. "2026/09/cranial-nerves-diagram.png"
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  title TEXT,
  caption TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_media_created ON media(created_at);

-- ---------------------------------------------------------------------------
-- Articles / study notes
-- ---------------------------------------------------------------------------

CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  -- Tiptap JSON document (source of truth for re-editing)
  content_json TEXT,
  -- Sanitized semantic HTML rendered for the public site
  content_html TEXT NOT NULL DEFAULT '',
  -- 'article' | 'study-note'
  article_type TEXT NOT NULL DEFAULT 'article'
    CHECK (article_type IN ('article', 'study-note')),
  -- 'draft' | 'review' | 'scheduled' | 'published' | 'unpublished' | 'deleted'
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'unpublished', 'deleted')),
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  featured_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  scheduled_at TEXT,
  published_at TEXT,
  deleted_at TEXT,
  seo_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  -- robots directive, e.g. 'index,follow' (default) or 'noindex,follow'
  robots TEXT NOT NULL DEFAULT 'index,follow',
  reading_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subject_id, slug)
);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_subject_status ON articles(subject_id, status);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_published ON articles(published_at);
CREATE INDEX idx_articles_updated ON articles(updated_at);

CREATE TABLE article_tags (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE article_media (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, media_id)
);

CREATE TABLE article_related (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  related_article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, related_article_id)
);

-- Full snapshots on every manual save/publish (restore + diff history).
CREATE TABLE revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_revisions_article ON revisions(article_id, created_at);

-- ---------------------------------------------------------------------------
-- MCQs
-- ---------------------------------------------------------------------------

CREATE TABLE mcqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  -- 'draft' | 'published' | 'unpublished' | 'deleted'
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'unpublished', 'deleted')),
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  -- JSON array of tag names
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mcqs_subject ON mcqs(subject_id, status);
CREATE INDEX idx_mcqs_article ON mcqs(article_id);
CREATE INDEX idx_mcqs_status ON mcqs(status);

CREATE TABLE mcq_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mcq_id INTEGER NOT NULL REFERENCES mcqs(id) ON DELETE CASCADE,
  -- Presentation letter (A, B, C, ...)
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_mcq_options_mcq ON mcq_options(mcq_id, sort_order);

-- ---------------------------------------------------------------------------
-- References
-- ---------------------------------------------------------------------------

CREATE TABLE "references" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 'textbook' | 'journal' | 'guideline' | 'organization' | 'educational'
  ref_type TEXT NOT NULL DEFAULT 'textbook'
    CHECK (ref_type IN ('textbook', 'journal', 'guideline', 'organization', 'educational')),
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',      -- journal / publisher / organization
  year TEXT,
  edition TEXT,
  url TEXT,
  doi TEXT,
  accessed_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE article_references (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  reference_id INTEGER NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, reference_id)
);

-- ---------------------------------------------------------------------------
-- Public URL redirect map (slug changes on published content)
-- ---------------------------------------------------------------------------

CREATE TABLE redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT 'slug-change',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Audit log for administrative actions
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,             -- e.g. 'article.publish', 'media.delete'
  entity_type TEXT,
  entity_id INTEGER,
  detail_json TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
