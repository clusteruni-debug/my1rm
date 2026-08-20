# Behavior Analytics - My1RM

My1RM measures a product funnel, not just page requests. Counts are anonymous
browser-tab sessions, not verified unique people.

## Milestones

1. `page_view`
2. `calculator_started`
3. `estimate_completed`
4. `percentile_viewed`
5. `rank_submit_attempt`
6. `rank_submit_success` or `rank_submit_failure`

The browser queues milestones in this order and tries each request at most three
times. Permanent client rejections and exhausted transient failures are settled
so later renders do not retry forever. A successful milestone is stored once per
tab session. The event request contains
only `session_id`, `event_name`, and the boolean `is_internal`; the server
adds the timestamp. The endpoint rejects exercise, body, demographic, location,
raw-IP, and extra fields.

Ranking data stays in the separate `records` table and is written only after
the ranking button is pressed. Its random per-tab key is distinct from the
analytics session ID. A tab has at most one external ranking row; another external
submission from that tab replaces its prior row. A browser marked as internal
receives a no-store acknowledgement and neither queries cohort standings nor
writes or replaces a row in `records`.

## Mark the operator browser

Open this URL once in each browser profile used for internal checks:

```text
https://my1rm.pages.dev/?internal=1
```

The query parameter is removed from the address bar and the flag remains in
localStorage. The browser still sends the same minimal milestone payload with
`is_internal: true`, making the exclusion visible and auditable. Every default
report filters those rows with `is_internal = 0`. Applying either `?internal=1`
or `?internal=0` starts a fresh analytics tab session, preventing one session
from being split between internal and external reporting. Ranking requests also
carry the flag; internal ranking requests return without reading or writing the
ranking table.

Re-enable external measurement on that browser with:

```text
https://my1rm.pages.dev/?internal=0
```

This flag is client-asserted and scoped to one browser profile. Clearing site
data removes it. It is not retroactive: rows stored before the flag changed keep
their original value.

## Apply the schema

From `projects/my1rm`, first inspect the deployed ranking columns:

```powershell
npx --yes wrangler@latest d1 execute my1rm --remote --command="PRAGMA table_info(records);"
```

For the existing production database, if `session_id` is absent, apply the
one-time migration before the full schema:

```powershell
npx --yes wrangler@latest d1 execute my1rm --remote --file=migrations/0002_rank_session_id.sql
npx --yes wrangler@latest d1 execute my1rm --remote --file=schema.sql
```

Do not rerun the migration after the column exists. Fresh databases need only
`schema.sql`. Existing rows remain valid with a null `session_id`; the partial
unique index applies only to new session-linked rows.

## Read the report

```powershell
npx --yes wrangler@latest d1 execute my1rm --remote --file=scripts/analytics-report.sql
```

The report returns:

- an ordered all-time funnel whose stages are nested, so conversion cannot
  exceed 100%;
- active sessions and visits for 24 hours, 7 days, 30 days, and all time;
- 30 KST calendar-day cohorts;
- the 100 most recent external milestones.

Every query excludes internal rows. The public site exposes no analytics read
endpoint.

## Interpretation

- `page_view` without `calculator_started`: opened the page only.
- `calculator_started` without `estimate_completed`: began but did not finish
  all three lifts.
- `estimate_completed`: produced an SBD total.
- `percentile_viewed`: also completed sex, age, and bodyweight fields.
- `rank_submit_success`: created or updated that tab session's ranking row.
- A new tab creates a new session. Reloads in the same tab reuse the session and
  do not add duplicate milestones.
