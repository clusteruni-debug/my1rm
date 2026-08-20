-- My1RM private behavior report. Every query excludes internal rows.

-- 1) All-time ordered funnel and conversion. Each stage is a subset of its
-- prerequisite, so missing or delayed client events cannot produce >100% rates.
WITH
external_events AS (
  SELECT DISTINCT session_id, event_name
  FROM behavior_events
  WHERE is_internal = 0
),
page_views AS (
  SELECT session_id FROM external_events WHERE event_name = 'page_view'
),
calculator_starts AS (
  SELECT events.session_id
  FROM external_events AS events
  JOIN page_views USING (session_id)
  WHERE events.event_name = 'calculator_started'
),
estimates AS (
  SELECT events.session_id
  FROM external_events AS events
  JOIN calculator_starts USING (session_id)
  WHERE events.event_name = 'estimate_completed'
),
percentiles AS (
  SELECT events.session_id
  FROM external_events AS events
  JOIN estimates USING (session_id)
  WHERE events.event_name = 'percentile_viewed'
),
rank_attempts AS (
  SELECT events.session_id
  FROM external_events AS events
  JOIN percentiles USING (session_id)
  WHERE events.event_name = 'rank_submit_attempt'
),
rank_successes AS (
  SELECT events.session_id
  FROM external_events AS events
  JOIN rank_attempts USING (session_id)
  WHERE events.event_name = 'rank_submit_success'
),
rank_failures AS (
  SELECT events.session_id
  FROM external_events AS events
  JOIN rank_attempts USING (session_id)
  WHERE events.event_name = 'rank_submit_failure'
),
stage_sessions(step, event_name, denominator_event, session_id) AS (
  SELECT 1, 'page_view', 'page_view', session_id FROM page_views
  UNION ALL
  SELECT 2, 'calculator_started', 'page_view', session_id FROM calculator_starts
  UNION ALL
  SELECT 3, 'estimate_completed', 'calculator_started', session_id FROM estimates
  UNION ALL
  SELECT 4, 'percentile_viewed', 'estimate_completed', session_id FROM percentiles
  UNION ALL
  SELECT 5, 'rank_submit_attempt', 'percentile_viewed', session_id FROM rank_attempts
  UNION ALL
  SELECT 6, 'rank_submit_success', 'rank_submit_attempt', session_id FROM rank_successes
  UNION ALL
  SELECT 7, 'rank_submit_failure', 'rank_submit_attempt', session_id FROM rank_failures
),
stages(step, event_name, denominator_event) AS (
  VALUES
    (1, 'page_view', 'page_view'),
    (2, 'calculator_started', 'page_view'),
    (3, 'estimate_completed', 'calculator_started'),
    (4, 'percentile_viewed', 'estimate_completed'),
    (5, 'rank_submit_attempt', 'percentile_viewed'),
    (6, 'rank_submit_success', 'rank_submit_attempt'),
    (7, 'rank_submit_failure', 'rank_submit_attempt')
),
counts AS (
  SELECT event_name, COUNT(DISTINCT session_id) AS sessions
  FROM stage_sessions
  GROUP BY event_name
),
joined AS (
  SELECT
    stages.step,
    stages.event_name,
    stages.denominator_event,
    COALESCE(counts.sessions, 0) AS sessions
  FROM stages
  LEFT JOIN counts ON counts.event_name = stages.event_name
)
SELECT
  joined.step,
  joined.event_name,
  joined.sessions,
  ROUND(
    100.0 * joined.sessions /
    NULLIF((SELECT sessions FROM joined AS visits WHERE visits.event_name = 'page_view'), 0),
    1
  ) AS from_visit_pct,
  ROUND(
    100.0 * joined.sessions /
    NULLIF((SELECT sessions FROM joined AS prior WHERE prior.event_name = joined.denominator_event), 0),
    1
  ) AS from_prior_pct
FROM joined
ORDER BY joined.step;

-- 2) External activity by recent time window.
WITH windows(sort_order, period, start_at) AS (
  VALUES
    (1, '24h', datetime('now', '-1 day')),
    (2, '7d', datetime('now', '-7 days')),
    (3, '30d', datetime('now', '-30 days')),
    (4, 'all', '1970-01-01 00:00:00')
)
SELECT
  windows.period,
  COUNT(DISTINCT behavior_events.session_id) AS active_sessions,
  COUNT(DISTINCT CASE WHEN behavior_events.event_name = 'page_view' THEN behavior_events.session_id END) AS visits,
  COUNT(DISTINCT CASE WHEN behavior_events.event_name = 'estimate_completed' THEN behavior_events.session_id END) AS completed,
  COUNT(DISTINCT CASE WHEN behavior_events.event_name = 'rank_submit_success' THEN behavior_events.session_id END) AS ranked
FROM windows
LEFT JOIN behavior_events
  ON behavior_events.is_internal = 0
 AND behavior_events.created_at >= windows.start_at
GROUP BY windows.sort_order, windows.period
ORDER BY windows.sort_order;

-- 3) KST daily cohorts for the last 30 calendar days. A session belongs to the
-- KST day of its page_view, and later columns keep the same ordered prerequisites.
WITH raw_session_flags AS (
  SELECT
    session_id,
    date(MIN(CASE WHEN event_name = 'page_view' THEN created_at END), '+9 hours') AS day,
    MAX(CASE WHEN event_name = 'calculator_started' THEN 1 ELSE 0 END) AS started,
    MAX(CASE WHEN event_name = 'estimate_completed' THEN 1 ELSE 0 END) AS completed,
    MAX(CASE WHEN event_name = 'percentile_viewed' THEN 1 ELSE 0 END) AS percentiled,
    MAX(CASE WHEN event_name = 'rank_submit_attempt' THEN 1 ELSE 0 END) AS attempted,
    MAX(CASE WHEN event_name = 'rank_submit_success' THEN 1 ELSE 0 END) AS succeeded,
    MAX(CASE WHEN event_name = 'rank_submit_failure' THEN 1 ELSE 0 END) AS failed
  FROM behavior_events
  WHERE is_internal = 0
  GROUP BY session_id
),
session_funnel AS (
  SELECT
    session_id,
    day,
    started,
    CASE WHEN started = 1 AND completed = 1 THEN 1 ELSE 0 END AS completed,
    CASE WHEN started = 1 AND completed = 1 AND percentiled = 1 THEN 1 ELSE 0 END AS percentiled,
    CASE WHEN started = 1 AND completed = 1 AND percentiled = 1 AND attempted = 1 THEN 1 ELSE 0 END AS attempted,
    CASE WHEN started = 1 AND completed = 1 AND percentiled = 1 AND attempted = 1 AND succeeded = 1 THEN 1 ELSE 0 END AS succeeded,
    CASE WHEN started = 1 AND completed = 1 AND percentiled = 1 AND attempted = 1 AND failed = 1 THEN 1 ELSE 0 END AS failed
  FROM raw_session_flags
)
SELECT
  day,
  COUNT(*) AS visits,
  SUM(started) AS starts,
  SUM(completed) AS completed,
  SUM(percentiled) AS percentiles,
  SUM(attempted) AS rank_attempts,
  SUM(succeeded) AS rank_successes,
  SUM(failed) AS rank_failures
FROM session_funnel
WHERE day IS NOT NULL
  AND day >= date('now', '+9 hours', '-29 days')
GROUP BY day
ORDER BY day DESC;

-- 4) Recent external milestones for checking whether a session did more than visit.
SELECT
  created_at,
  substr(session_id, 1, 8) AS session,
  event_name
FROM behavior_events
WHERE is_internal = 0
ORDER BY created_at DESC, id DESC
LIMIT 100;
