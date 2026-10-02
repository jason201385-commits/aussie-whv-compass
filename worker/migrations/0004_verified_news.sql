CREATE TABLE news_items (
  news_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 600),
  source_url TEXT NOT NULL UNIQUE,
  feed_url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  verification_method TEXT NOT NULL CHECK (verification_method = 'official-feed+source-page'),
  title_match_score REAL NOT NULL CHECK (title_match_score >= 0 AND title_match_score <= 1),
  source_content_hash TEXT NOT NULL CHECK (length(source_content_hash) = 64),
  keywords_json TEXT NOT NULL,
  primary_topic TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX idx_news_items_primary_topic_published ON news_items(primary_topic, published_at DESC);

CREATE TABLE news_source_state (
  source_id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  last_attempt_at TEXT NOT NULL,
  last_success_at TEXT,
  last_http_status INTEGER,
  last_error_code TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_item_published_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE news_sync_runs (
  run_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  fetched_count INTEGER NOT NULL DEFAULT 0,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  verified_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_news_sync_runs_source_started ON news_sync_runs(source_id, started_at DESC);
