# AGENT_TASK_BOARD

Created: 2026-05-22
Purpose: prevent task duplication between AI/LLM agents and enable conflict-free parallel work
Scope: project:my1rm
Generated-by: scripts/extract-project-board.py

## Operating Policy
- Board is maintained.
- Records require minimum fields only: `TASK-ID`, `Owner-Agent`, `Status`, `Scope-Files`.
- Workspace-scope tasks stay in the root board; project-scope tasks live in `projects/<slug>/AGENT_TASK_BOARD.md` when present.

## Task Board
### Active Tasks - project:my1rm
| TASK-ID | Owner-Agent | Status | Scope-Files | Notes | Change-Type |
|---------|-------------|--------|-------------|-------|-------------|
| MY1RM-REVIEW-FIX-20260802-01 | codex | in_progress | projects/my1rm/{app.js,index.html,functions/api/events.js,functions/api/rank.js,schema.sql,migrations/0002_rank_session_id.sql,tests/analytics.test.mjs,tests/rank.test.mjs,scripts/analytics-report.sql,docs/analytics.md,docs/deploy.md,DESIGN.md,privacy.html,package.json,AGENTS.md,CLAUDE.md} | Claude review FAIL findings을 수정해 My1RM 퍼널과 랭킹 집계를 안정화하고 재검증한다.; Verify: npm run check; browser runtime smoke; git diff --check; Claude Code re-review; Approved: user [write,schema,runtime,dependency]; Operations: write,schema,runtime,dependency | code |
| MY1RM-FUNNEL-20260801-01 | codex | blocked | projects/my1rm/{index.html,styles.css,app.js,schema.sql,privacy.html,DESIGN.md,functions/api/events.js,tests/analytics.test.mjs,scripts/analytics-report.sql,docs/analytics.md,docs/deploy.md} | USER-GATE: C:\vibe\memory\reviews\cc-review-MY1RM-FUNNEL-20260801-01.handoff.txt 전체 내용을 신뢰된 Claude Code 대화에 붙여 넣어 리뷰 증거 파일을 생성해 주세요.; 승인된 3대 추정 UI를 운영에 적용하고 익명 외부 세션 행동 퍼널을 D1에 집계한다.; Verify: npm run check; events/rank ESM syntax; browser smoke; remote D1 query; live Pages smoke; Approved: user [write,schema,runtime]; Operations: write,schema,runtime | schema |
| MY1RM-SBD-MOCKUP-20260801-01 | codex | done | projects/my1rm/docs/my1rm-sbd-focus-preview.html,projects/my1rm/DESIGN.md | User approved iteration 2; SBD-only mock-up separates reference percentile from participant ranking.; Verify: npm run check + Playwright smoke-v2; Approved: user [write]; Operations: write | code |
| MY1RM-D1-DOC-SYNC-Y0-20260722-01 | codex | blocked | none (registration recovery only) | Execute My1RM plan Y0 and the conflict-free AGENTS verification portion of Y1 so documentation matches the shipped anonymous D1 ranking path.; Verify: npm run check; node --check functions/api/rank.js; python scripts/regen-domain-map.py --check --project my1rm; plan lint; git diff --check; Approved: user [write]; Operations: write | docs-only |

### Active File Locks
<!-- 1 codex task transitioned review -> done at 2026-08-02T04:01+09:00: MY1RM-SBD-MOCKUP-20260801-01 -->
<!-- 1 codex tasks transitioned review -> done at 2026-07-23T16:09:41+09:00: MY1RM-D1-DOC-SYNC-Y0-20260722-02 -->
| File Path | Locked By | TASK-ID | Locked At | Release Condition |
|-----------|-----------|---------|-----------|-------------------|
| projects/my1rm/app.js | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/index.html | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/functions/api/events.js | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/functions/api/rank.js | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/schema.sql | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/migrations/0002_rank_session_id.sql | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/tests/analytics.test.mjs | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/tests/rank.test.mjs | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/scripts/analytics-report.sql | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/privacy.html | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
| projects/my1rm/package.json | codex | MY1RM-REVIEW-FIX-20260802-01 | 2026-08-02T01:23:45+09:00 | status=review/done/blocked |
