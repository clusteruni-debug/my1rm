# Behavior Analytics - My1RM

My1RM measures a product funnel, not just page requests. Counts are anonymous
browser-tab sessions, not verified unique people.

## Milestones

1. `page_view`
2. `calculator_started`
3. `estimate_completed`
4. `percentile_viewed`
5. `rank_submit_attempt`
6. `rank_submit_success`
7. `rank_submit_failure`

Each session can store each milestone once. The browser sends only
`session_id` and `event_name`; the server adds the timestamp. Ranking data stays
in the separate `records` table and is written only after the ranking button is
pressed.

## Exclude the operator device

Open this URL once on each device/browser used for internal checks:

```text
https://my1rm.pages.dev/?internal=1
```

The query parameter is removed from the address bar and the exclusion remains
in localStorage. An excluded device sends no `/api/events` requests. Re-enable
measurement on that browser with:

```text
https://my1rm.pages.dev/?internal=0
```

The flag is not retroactive. Sessions recorded before the device was excluded
remain in D1.

## Apply the table

From `projects/my1rm`:

```powershell
npx --yes wrangler@latest d1 execute my1rm-db --remote --file=schema.sql
```

`schema.sql` is additive and idempotent. It keeps the existing ranking table and
adds `behavior_events`.

## Read the report

```powershell
npx --yes wrangler@latest d1 execute my1rm-db --remote --file=scripts/analytics-report.sql
```

The report returns:

- all-time funnel counts and conversion rates;
- external sessions for 24 hours, 7 days, 30 days, and all time;
- a 30-day daily funnel;
- the 100 most recent milestones, grouped by the first eight characters of the
  random session key.

Every query includes `is_internal = 0`. The public site exposes no analytics
read endpoint.

## Interpretation

- `page_view` without `calculator_started`: opened the page only.
- `calculator_started` without `estimate_completed`: began but did not finish
  all three lifts.
- `estimate_completed`: produced an SBD total.
- `percentile_viewed`: also completed sex, age, and bodyweight fields.
- `rank_submit_success`: created a participant ranking record.
- A new tab creates a new session. Reloads in the same tab reuse the same session
  and do not add duplicate milestones.