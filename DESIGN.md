# My1RM Design Contract

Status: production review fix (MY1RM-REVIEW-FIX-20260802-01)
Updated: 2026-08-02
Mock-up: `docs/my1rm-sbd-focus-preview.html` (approved 2026-08-01)

## Product promise

My1RM estimates the squat, bench press, and deadlift total from one working set
per lift, then shows a reference percentile for fun. Participant ranking stays
a separate action.

## Direction

Iteration 1 was rejected because the extra headline, helper sentences, badges,
nested cards, and status labels made the calculator slower to scan than the
current app.

Iteration 2 is one compact utility surface:

- one short title: `3대 추정`
- three input rows
- one primary result: `예상 3대`
- one compact reference percentile section
- one separate participant-rank action
- labels instead of explanatory sentences
- dividers instead of nested cards

Keep the existing neutral background, white surface, system font, and orange
result accent. Do not add a marketing hero, gradient, illustration, achievement
label, or motivational copy.

## Information hierarchy

1. Squat, bench press, and deadlift working-set inputs.
2. Estimated three-lift total.
3. `예상 백분위`, marked `데모 데이터 기준`.
4. `참여자 순위`, marked `기록 제출 후 표시`, with `순위 보기`.

## State contract

- Lift weights start blank. Reps may default to five.
- A fresh visit shows no non-zero result or percentile.
- Each lift estimate appears after that row has a valid working set.
- The total appears only after all three lifts are valid.
- The percentile appears only after all three lifts and comparison fields are
  complete.
- Calculation alone never submits a participant record.

## Copy contract

Visible product copy is limited to labels, values, actions, and two factual
qualifiers:

- `데모 데이터 기준`
- `기록 제출 후 표시`

The footer may retain the terse disclaimer
`추정 도구 · 코칭·의료·판정 조언 아님`.

Do not use onboarding prose, motivational labels, completion badges, or
sentences that repeat what the controls already show. Pull-up is outside this
surface.

## Existing tokens

| Token | Value |
| --- | --- |
| Background | `#f5f6f8` |
| Card | `#ffffff` |
| Text | `#15181d` |
| Muted text | `#626b78` |
| Border | `#e4e7ec` |
| Strong border | `#d3d8e0` |
| Primary | `#ea580c` |
| Primary hover | `#c2470a` |
| Radius | `12px` |

## Responsive and accessibility rules

- Desktop and mobile use the same reading order.
- The main surface stays at or below 760px.
- Mobile lift rows wrap without horizontal scrolling.
- Inputs and buttons keep a minimum 44px target.
- Labels do not rely on placeholders.
- Keyboard focus remains visible.
- Reduced-motion preferences disable transitions.

## Production implementation

The user approved iteration 2 before production work. `index.html`, `styles.css`,
and the browser UI in `app.js` now implement this contract. The calculation
formulas remain unchanged. Participant ranking still requires an explicit
button press; its separate random per-tab ranking key only replaces a later
submission from the same tab and is not the analytics session ID.

## Measurement contract

Product behavior is measured as anonymous per-tab milestones:

1. `page_view`
2. `calculator_started`
3. `estimate_completed`
4. `percentile_viewed`
5. `rank_submit_attempt`
6. `rank_submit_success`
7. `rank_submit_failure`

The analytics request contains only `session_id`, `event_name`, and the
boolean `is_internal`. Exercise, body, demographic, location, and IP fields are
rejected by the endpoint. Each milestone is unique per session. `?internal=1`
stores a browser flag and marks later milestones internal; `?internal=0`
clears it. Default reports exclude marked rows. Participant records remain
opt-in and are still submitted only through the ranking button.

The private report is `scripts/analytics-report.sql`; no public read API is
provided.
