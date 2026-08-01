-- My1RM private behavior report. Every query excludes internal rows.

-- 1) All-time funnel and conversion.
WITH
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
  FROM behavior_events
  WHERE is_internal = 0
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

-- 2) External sessions by recent time window.
WITH windows(sort_order, period, start_at) AS (
  VALUES
    (1, '24h', datetime('now', '-1 day')),
    (2, '7d', datetime('now', '-7 days')),
    (3, '30d', datetime('now', '-30 days')),
    (4, 'all', '1970-01-01 00:00:00')
)
SELECT
  windows.period,
  COUNT(DISTINCT behavior_events.session_id) AS sessions,
  COUNT(DISTINCT CASE WHEN behavior_events.event_name = 'estimate_completed' THEN behavior_events.session_id END) AS completed,
  COUNT(DISTINCT CASE WHEN behavior_events.event_name = 'rank_submit_success' THEN behavior_events.session_id END) AS ranked
FROM windows
LEFT JOIN behavior_events
  ON behavior_events.is_internal = 0
 AND behavior_events.created_at >= windows.start_at
GROUP BY windows.sort_order, windows.period
ORDER BY windows.sort_order;

-- 3) Daily external funnel for the last 30 days.
SELECT
  date(created_at) AS day,
  COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN session_id END) AS visits,
  COUNT(DISTINCT CASE WHEN event_name = 'calculator_started' THEN session_id END) AS starts,
  COUNT(DISTINCT CASE WHEN event_name = 'estimate_completed' THEN session_id END) AS completed,
  COUNT(DISTINCT CASE WHEN event_name = 'percentile_viewed' THEN session_id END) AS percentiles,
  COUNT(DISTINCT CASE WHEN event_name = 'rank_submit_attempt' THEN session_id END) AS rank_attempts,
  COUNT(DISTINCT CASE WHEN event_name = 'rank_submit_success' THEN session_id END) AS rank_successes,
  COUNT(DISTINCT CASE WHEN event_name = 'rank_submit_failure' THEN session_id END) AS rank_failures
FROM behavior_events
WHERE is_internal = 0
  AND created_at >= datetime('now', '-30 days')
GROUP BY date(created_at)
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