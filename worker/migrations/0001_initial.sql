PRAGMA foreign_keys = ON;

CREATE TABLE contact_cases (
  case_id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'course-workshop',
    'website-digital-tool',
    'content-data-community',
    'other-collaboration'
  )),
  description TEXT NOT NULL,
  contact_name TEXT,
  organization TEXT,
  timeline TEXT,
  budget_range TEXT,
  locale TEXT NOT NULL DEFAULT 'zh-Hant',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received',
    'in-review',
    'replied',
    'closed',
    'deletion-pending'
  )),
  retention_class TEXT NOT NULL DEFAULT 'general-inquiry'
    CHECK (retention_class = 'general-inquiry'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_contact_at TEXT NOT NULL,
  closed_at TEXT,
  delete_after TEXT NOT NULL,
  confirmation_sent_at TEXT
);

CREATE INDEX contact_cases_status_updated_idx
  ON contact_cases (status, updated_at);
CREATE INDEX contact_cases_delete_after_idx
  ON contact_cases (delete_after);

CREATE TABLE contact_access_tokens (
  token_hash TEXT PRIMARY KEY NOT NULL,
  case_id TEXT NOT NULL REFERENCES contact_cases(case_id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('manage', 'delete')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX contact_access_tokens_case_idx
  ON contact_access_tokens (case_id, purpose);

CREATE TABLE contact_mail_outbox (
  outbox_id TEXT PRIMARY KEY NOT NULL,
  case_id TEXT NOT NULL REFERENCES contact_cases(case_id) ON DELETE CASCADE,
  template_key TEXT NOT NULL CHECK (template_key IN (
    'contact-received',
    'deletion-received',
    'case-deleted'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sending',
    'sent',
    'retry',
    'failed'
  )),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT NOT NULL,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE INDEX contact_mail_outbox_pending_idx
  ON contact_mail_outbox (status, next_attempt_at);

CREATE TABLE daily_counters (
  metric_date TEXT NOT NULL,
  metric_key TEXT NOT NULL CHECK (metric_key IN (
    'route_opened',
    'official_source_opened',
    'task_test_started',
    'task_test_completed'
  )),
  counter_value INTEGER NOT NULL DEFAULT 0 CHECK (counter_value >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (metric_date, metric_key)
);
