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
| MY1RM-D1-DOC-SYNC-Y0-20260722-02 | codex | done | projects/my1rm/CLAUDE.md,projects/my1rm/CHANGELOG.md,projects/my1rm/agent_docs/domain-map.md,projects/my1rm/AGENTS.md,projects/my1rm/docs/plans/PLAN-MY1RM-D1-DOC-SYNC.md | Attribute, verify, and checkpoint the completed My1RM Y0 plus module-aware AGENTS portion of Y1 from the correct nested Git root.; Verify: npm run check; module-aware rank.js syntax/gate proof; domain-map check; plan lint; git diff --check; Approved: user [write]; Operations: write | docs-only |
| MY1RM-D1-DOC-SYNC-Y0-20260722-01 | codex | blocked | none (registration recovery only) | Execute My1RM plan Y0 and the conflict-free AGENTS verification portion of Y1 so documentation matches the shipped anonymous D1 ranking path.; Verify: npm run check; node --check functions/api/rank.js; python scripts/regen-domain-map.py --check --project my1rm; plan lint; git diff --check; Approved: user [write]; Operations: write | docs-only |

### Active File Locks
<!-- 1 codex tasks transitioned review -> done at 2026-07-23T16:09:41+09:00: MY1RM-D1-DOC-SYNC-Y0-20260722-02 -->
| File Path | Locked By | TASK-ID | Locked At | Release Condition |
|-----------|-----------|---------|-----------|-------------------|
