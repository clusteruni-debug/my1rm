---
plan_id: MY1RM-D1-DOC-SYNC
project: my1rm
status: PROPOSED
status_reason: "Authored 2026-07-04 from workspace audit V2 (evidence: /c/vibe/memory/reviews/workspace-audit-v2-findings-20260704.md §P my1rm). Root cause: anonymous D1 ranking feature shipped but CLAUDE.md / projects.json registry / CHANGELOG still deny a backend DB, and no verification path covers functions/api/rank.js. Also app.js 860 > 800 hard cap. Execution not started."
milestones:
  - { id: Y0, label: "Doc truth: CLAUDE.md rewritten to describe the anonymous D1 ranking store; CHANGELOG note; domain-map rows for rank.js/schema.sql/wrangler.toml", done: false }
  - { id: Y1, label: "Registry + verify gates: projects.json db/schema fields set; node --check functions/api/rank.js added to registry verificationCommand + package.json check + AGENTS.md DoD", done: false }
  - { id: Y2, label: "app.js 860 split into ES modules each < 500 (calc / rank-fetch / UI wiring / i18n); styles.css 736 optional trim", done: false }
  - { id: Y3, label: "Verification: extended checks green, calculator test passes, rank flow smoke-tested against deployed endpoint", done: false }
decisions_pending: []
blockers: []
depends_on: []
git_strategy: sub-repo
last_verified: 2026-07-04
ko_translation:
  status_reason_ko: "2026-07-04 워크스페이스 감사 V2에서 작성. 근본 원인: 익명 D1 랭킹 기능은 출시됐는데 CLAUDE.md / 레지스트리 / CHANGELOG가 여전히 백엔드 DB 부재를 주장하고, rank.js를 검증하는 경로가 없음. app.js 860줄 > 800 하드캡. 실행 미시작."
  milestones_ko:
    - { id: Y0, label_ko: "문서 진실화: CLAUDE.md를 익명 D1 랭킹 저장소 설명으로 재작성, CHANGELOG 메모, domain-map에 rank.js/schema.sql/wrangler.toml 행 추가" }
    - { id: Y1, label_ko: "레지스트리 + 검증 게이트: projects.json db/schema 필드 설정, node --check functions/api/rank.js를 registry verificationCommand + package.json check + AGENTS.md DoD에 추가" }
    - { id: Y2, label_ko: "app.js 860줄을 각 500줄 미만 ES 모듈로 분할 (계산 / 랭킹 fetch / UI 배선 / i18n); styles.css 736 선택 정리" }
    - { id: Y3, label_ko: "검증: 확장 체크 green, 계산기 테스트 통과, 배포 엔드포인트 대상 랭킹 플로우 스모크" }
  decisions_pending_ko: []
  blockers_ko: []
---

# Plan — my1rm D1 Doc Sync

> **Goal (testable)**: `grep -i "no database\|without a backend" CLAUDE.md` = 0 and CLAUDE.md describes the D1 `records` store; my1rm row in `/c/vibe/config/projects.json` has `db: "D1"` + `schema.file: "schema.sql"`; the extended check command (incl. `node --check functions/api/rank.js`) exits 0 and demonstrably fails on a syntax-broken copy; every source file < 500 lines after Y2; `node tests/calculator.test.js` passes; deployed `/api/rank` probe returns 200.
> **Owner**: User (Decider) + any AI executor
> **Created**: 2026-07-04

## Background

Audit V2 (2026-07-04): my1rm shipped an anonymous Cloudflare D1 ranking feature — `functions/api/rank.js` INSERTs into `records`, `schema.sql` defines the table, `wrangler.toml:6-10` binds D1, `app.js:769` POSTs `/api/rank` — and README/AGENTS.md/privacy.html describe it correctly (anonymous, no IP, no account: this guardrail is honored and MUST be preserved). But three surfaces still deny the DB: `CLAUDE.md:7,14` ("without a backend database", "No account, saved records, or DB schema"), `config/projects.json:321-334` (`db:"—"`, `schema.file:null`), `CHANGELOG.md:9`. Risk: an agent trusting CLAUDE.md could delete `schema.sql` or break `rank.js` — and NO verification gate would catch it (registry verificationCommand + `package.json` "check" + AGENTS.md DoD all `node --check` only `app.js` + `location.js`).

Evidence with exact lines: `/c/vibe/memory/reviews/workspace-audit-v2-findings-20260704.md` §P my1rm.

## Approach

### Y0 — Doc truth (30 min)

| File | Fix | Verify |
|---|---|---|
| `CLAUDE.md:7,14` | Rewrite Purpose/Runtime: static calculator + Cloudflare Pages Functions + anonymous D1 ranking store (records saved; NO IP, NO account — copy the privacy stance from README/privacy.html) | `grep -in "D1\|records\|rank" CLAUDE.md` shows the store; `grep -i "no database\|without a backend" CLAUDE.md` = 0 |
| `CHANGELOG.md:9` | Append note: D1 records store shipped (date from `git log --follow -- functions/api/rank.js` first commit) | claim no longer false |
| `agent_docs/domain-map.md` | Add rows: `functions/api/rank.js`, `schema.sql`, `wrangler.toml` (the whole D1 write path is currently unmapped) | every code file appears in map |

### Y1 — Registry + verify gates (30 min)

1. `/c/vibe/config/projects.json` my1rm row: `db` → `"D1"`, `schema.file` → `"schema.sql"`; extend `verificationCommand` with `node --check functions/api/rank.js`. (Registry edit = WORKSPACE repo, atomic pathspec commit.)
2. `package.json` "check" script: append `&& node --check functions/api/rank.js`.
3. `AGENTS.md` DoD line: same extension.

**Verify**: full extended check → exit 0; then gate-proof: copy rank.js to /tmp, break syntax, `node --check` the copy → non-zero (prove the gate gates).

### Y2 — app.js split (1 session)

`app.js` (860 > 800 hard cap) mixes calc, UI wiring, i18n, rank-fetch. Split into ES modules (`<script type="module">` — the project has NO build step and none may be added):
- Indicative targets: `js/calc.js` (pure 1RM math), `js/rank.js` (POST/fetch), `js/i18n.js`, thin `app.js` wiring — cut along actual cohesion at read time.
- Preserve behavior: check `index.html` script tags, event listeners, and any inline `onclick=` handlers depending on globals (`grep -n "onclick" index.html`); `tests/calculator.test.js` imports must keep working.
- `styles.css` 736 (> 660): optional trim ONLY if zero-risk; else skip (LOW).

**Verify**: `wc -l app.js js/*.js` all < 500; `node tests/calculator.test.js` passes; `node --check` all JS green.

### Y3 — Verification

Re-run all Y0/Y1/Y2 verify commands; paste outputs into the workspace audit closeout doc (master M9). Runtime proof: browser smoke — compute a 1RM, submit a rank, observe 200 (or `curl -s -o /dev/null -w '%{http_code}'` against the deployed `/api/rank` with a valid probe body; deployed URL in README). If neither reachable, request user browser check — do NOT claim runtime-verified without it (Rule #8).

## Authoring Protocol

- [x] Context intake: CLAUDE.md/README/AGENTS.md/privacy.html + rank.js/schema.sql/wrangler.toml examined by audit agent; findings cited.
- [x] Evidence baseline: findings doc §P my1rm.
- [x] PLAN vs ADR: execution roadmap → PLAN. The anonymous-no-auth design is an existing decision (privacy.html) — preserved, not re-decided.
- [x] Split decision: single compact plan (one root cause).
- [x] Scope boundary: DO NOT add auth/accounts; DO NOT weaken the anonymous guardrail; no new deps; no build step.
- [x] Consumer/dependency check: registry edit touches workspace repo (MC dashboard consumer); rank API consumed only by app.js.
- [x] Verification design: gate-proof test in Y1; runtime proof in Y3.
- [x] Review path: Y2 refactor ~860 lines — volume trigger RECOMMENDED; `/codex:review --background` after Y2 or record "review skipped: volume-only, pure-move split with passing tests".

## Plan Quality Checklist

### Evidence And Scope
- [x] Evidence cited (file:line). / [x] Exact files. / [x] Non-goals (no auth, no build step). / [x] No open decisions.

### Decomposition
- [x] Y0/Y1 doc+config, Y2 code, Y3 verify — independent commits; Y3 last.
- [x] Rollback: git revert per commit.
- [x] Risk gates: Y1 gate-proof; Y2 review-or-skip-note.

### Acceptance And Proof
- [x] Measurable commands; runtime proof = rank submission 200; closeout location fixed (master M9 doc).
- [x] Static (node --check) vs runtime (deployed probe) separated.

## Spec Gap Checklist

### Resolved Gaps
- Anonymous guardrail: README/privacy.html are the correct SoT to copy from.

### Missing Questions
- [ ] None blocking.

### Undefined Guardrails
- [ ] No wrangler login / credentials handling in this plan — deployed-curl or user browser check only.

### Scope Risks
- [ ] Y2 tempting to redesign UI — forbidden; pure module split.

### Unvalidated Assumptions
- [ ] tests/calculator.test.js coverage of moved calc functions — if thin, add assertions (test-only additions allowed).

### Missing Acceptance Criteria
- [ ] None known.

### Edge Cases
- [ ] ES-module conversion changes global scope — inline handlers grep listed in Y2.

## Acceptance Criteria (overall)

- [ ] Goal-line commands green with pasted output; deployed rank 200-smoke recorded.
- [ ] SLA: Y0+Y1 one short session; Y2+Y3 one session.
- [ ] Adoption / measurement window: none (one-shot); master M9 regression re-check.

## References

- Evidence: `/c/vibe/memory/reviews/workspace-audit-v2-findings-20260704.md` §P my1rm
- Master: `/c/vibe/docs/plans/PLAN-WORKSPACE-AUDIT-V2.md`
- Rules: root CLAUDE.md Code Splitting (800 hard cap), critical.md #8

## Notes

> Generated by `/plan-new my1rm d1-doc-sync` on 2026-07-04; body filled same session.
> Lint: `python scripts/parse-plan-frontmatter.py --lint <this-file>`
