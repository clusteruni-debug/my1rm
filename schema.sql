-- my1rm visitor ranking — anonymous 1RM records (no IP, no account stored)
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squat_kg REAL NOT NULL DEFAULT 0,
  bench_kg REAL NOT NULL DEFAULT 0,
  deadlift_kg REAL NOT NULL DEFAULT 0,
  total_kg REAL NOT NULL,
  sex TEXT NOT NULL,
  age_bucket TEXT NOT NULL,
  country TEXT,
  city TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_city_total ON records (city, total_kg);
CREATE INDEX IF NOT EXISTS idx_country_total ON records (country, total_kg);
CREATE INDEX IF NOT EXISTS idx_total ON records (total_kg);
-- cohort percentile: WHERE sex = ? AND age_bucket = ? [AND total_kg < ?]
CREATE INDEX IF NOT EXISTS idx_sex_age_total ON records (sex, age_bucket, total_kg);
-- anonymous behavior funnel — one row per milestone per browser-tab session
-- session_id is random and session-scoped; no lift, body, demographic, geo, or IP data
CREATE TABLE IF NOT EXISTS behavior_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL CHECK (length(session_id) BETWEEN 20 AND 80),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'page_view',
    'calculator_started',
    'estimate_completed',
    'percentile_viewed',
    'rank_submit_attempt',
    'rank_submit_success',
    'rank_submit_failure'
  )),
  is_internal INTEGER NOT NULL DEFAULT 0 CHECK (is_internal IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (session_id, event_name)
);

CREATE INDEX IF NOT EXISTS idx_behavior_event_created
  ON behavior_events (event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_behavior_external_created
  ON behavior_events (is_internal, created_at, session_id);
