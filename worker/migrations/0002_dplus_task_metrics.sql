PRAGMA foreign_keys = ON;

CREATE TABLE daily_counters_v2 (
  metric_date TEXT NOT NULL,
  metric_key TEXT NOT NULL CHECK (metric_key IN (
    'route_opened',
    'official_source_opened',
    'task_test_started',
    'task_find_route_success_30s',
    'task_evidence_understood',
    'task_help_route_correct',
    'task_test_completed'
  )),
  counter_value INTEGER NOT NULL DEFAULT 0 CHECK (counter_value >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (metric_date, metric_key)
);

INSERT INTO daily_counters_v2 (metric_date, metric_key, counter_value, updated_at)
SELECT metric_date, metric_key, counter_value, updated_at
FROM daily_counters;

DROP TABLE daily_counters;
ALTER TABLE daily_counters_v2 RENAME TO daily_counters;
