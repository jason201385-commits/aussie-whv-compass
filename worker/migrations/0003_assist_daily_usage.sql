-- One aggregate row per Australia/Perth day for the AI fallback cap.
-- No question text, token or request row is ever stored here.
CREATE TABLE assist_daily_usage (
  day TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);
