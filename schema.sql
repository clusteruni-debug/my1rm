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
