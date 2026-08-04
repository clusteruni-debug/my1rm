# Data Schema — My1RM

> Backend: **Cloudflare D1** (SQLite). Bound to the Pages Functions runtime; there is no
> server and no ORM — `schema.sql` at the project root is the single source of truth and
> the only thing that creates these tables.
> last_verified: 2026-08-05 (read directly from `schema.sql`; no live D1 introspection —
> see Verification below for what that does and does not prove)

## Privacy posture — read this before adding a column

The whole schema is built so a row cannot be traced to a person. No account, no IP, no
user agent, no free text. Two tables, and they are deliberately kept apart:

- `records` holds the lift numbers that appear on the public ranking.
- `behavior_events` holds the funnel milestones.

Both carry a `session_id`, and **they are not the same key space**. `records.session_id`
is a ranking-only per-tab key whose sole job is "one ranking entry per tab";
`behavior_events.session_id` is a random session-scoped key that carries no lift, body,
demographic, geo, or IP data. Joining the two is not a supported operation — doing it
would re-identify a ranked lifter's browsing funnel, which is exactly what the split
exists to prevent.

## `records` — public ranking entries

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `squat_kg` | REAL NOT NULL DEFAULT 0 | one lift may be 0 (partial entry) |
| `bench_kg` | REAL NOT NULL DEFAULT 0 | |
| `deadlift_kg` | REAL NOT NULL DEFAULT 0 | |
| `total_kg` | REAL NOT NULL | the ranked value; no DB-level guarantee it equals the sum of the three |
| `sex` | TEXT NOT NULL | cohort key |
| `age_bucket` | TEXT NOT NULL | cohort key — bucket, never a birth date |
| `country` | TEXT | nullable — geo is best-effort |
| `city` | TEXT | nullable |
| `created_at` | TEXT NOT NULL DEFAULT `datetime('now')` | UTC, SQLite text timestamp |
| `session_id` | TEXT, `length BETWEEN 20 AND 80` | nullable; ranking-only per-tab key |

Indexes:

| Index | Columns | Serves |
|---|---|---|
| `idx_total` | `total_kg` | global leaderboard |
| `idx_city_total` | `city, total_kg` | city leaderboard |
| `idx_country_total` | `country, total_kg` | country leaderboard |
| `idx_sex_age_total` | `sex, age_bucket, total_kg` | cohort percentile — `WHERE sex = ? AND age_bucket = ? [AND total_kg < ?]` |
| `idx_records_session` | `session_id` UNIQUE, partial `WHERE session_id IS NOT NULL` | one ranking row per tab |

The partial unique index is the load-bearing detail: it enforces one entry per session
**while still allowing many rows with `session_id IS NULL`**. A plain `UNIQUE` would have
collapsed every anonymous row into one.

## `behavior_events` — anonymous funnel

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `session_id` | TEXT NOT NULL, `length BETWEEN 20 AND 80` | random, session-scoped |
| `event_name` | TEXT NOT NULL, CHECK enum | see below |
| `is_internal` | INTEGER NOT NULL DEFAULT 0, CHECK `IN (0,1)` | own-traffic exclusion flag |
| `created_at` | TEXT NOT NULL DEFAULT `datetime('now')` | UTC |

`UNIQUE (session_id, event_name)` — each milestone is recorded **at most once per
session**, so these are reach counts, not hit counts. Reading a row count as "number of
times X happened" is wrong; it is "number of sessions that ever reached X".

`event_name` is a closed set enforced by CHECK (adding a value requires a migration):
`page_view` → `calculator_started` → `estimate_completed` → `percentile_viewed` →
`rank_submit_attempt` → `rank_submit_success` | `rank_submit_failure`.

Indexes: `idx_behavior_event_created (event_name, created_at)` for per-milestone time
series, and `idx_behavior_external_created (is_internal, created_at, session_id)` for the
external-only funnel — `is_internal` leads so the common "exclude our own traffic" filter
is served by the index rather than a scan.

## Migrations

There is no migration tool. Every statement in `schema.sql` is `CREATE ... IF NOT EXISTS`,
so applying it against an existing database is a no-op for objects that already exist —
and therefore it **cannot alter an existing table**. Changing a column type, widening a
CHECK, or dropping a column needs a hand-written `ALTER`/rebuild against D1; editing
`schema.sql` alone silently does nothing to a live database.

## Verification

```bash
# what this doc was written from (authoritative for shape):
cat schema.sql

# what is actually deployed (requires wrangler auth; NOT run for this stamp):
npx wrangler d1 execute <binding> --command "SELECT name, sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY name;"
```

The `last_verified` stamp above reflects a read of `schema.sql`, which is the source that
creates the schema — it is not evidence that the deployed D1 database matches it. If those
two ever disagree, the live database wins and this doc is wrong: run the `wrangler`
command and reconcile.
