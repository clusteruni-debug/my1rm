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
| MY1RM-FUNNEL-20260801-01 | codex | blocked | projects/my1rm/{index.html,styles.css,app.js,schema.sql,privacy.html,DESIGN.md,functions/api/events.js,tests/analytics.test.mjs,scripts/analytics-report.sql,docs/analytics.md,docs/deploy.md} | USER-GATE: C:\vibe\memory\reviews\cc-review-MY1RM-FUNNEL-20260801-01.handoff.txt 전체 내용을 신뢰된 Claude Code 대화에 붙여 넣어 리뷰 증거 파일을 생성해 주세요.; 승인된 3대 추정 UI를 운영에 적용하고 익명 외부 세션 행동 퍼널을 D1에 집계한다.; Verify: npm run check; events/rank ESM syntax; browser smoke; remote D1 query; live Pages smoke; Approved: user [write,schema,runtime]; Operations: write,schema,runtime | schema |
| MY1RM-D1-DOC-SYNC-Y0-20260722-01 | codex | blocked | none (registration recovery only) | Execute My1RM plan Y0 and the conflict-free AGENTS verification portion of Y1 so documentation matches the shipped anonymous D1 ranking path.; Verify: npm run check; node --check functions/api/rank.js; python scripts/regen-domain-map.py --check --project my1rm; plan lint; git diff --check; Approved: user [write]; Operations: write | docs-only |

### Active File Locks
<!-- 1 codex task transitioned review -> done at 2026-08-02T04:01+09:00: MY1RM-SBD-MOCKUP-20260801-01 -->
<!-- 1 codex tasks transitioned review -> done at 2026-07-23T16:09:41+09:00: MY1RM-D1-DOC-SYNC-Y0-20260722-02 -->
| File Path | Locked By | TASK-ID | Locked At | Release Condition |
|-----------|-----------|---------|-----------|-------------------|
