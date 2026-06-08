# My1RM — AGENTS.md

> Global rules: see workspace root `AGENTS.md` and `config/codex-global/RUNTIME-CONTRACT.md`.
> Detailed context: See `CLAUDE.md`

## MUST (PR rejected if violated)

- [ ] Keep the MVP install-free — static HTML/CSS/vanilla JS only, no build step, no package dependencies
- [ ] 1RM estimation must stay the documented Epley / Brzycki / Lombardi average — no silent formula swap
- [ ] Percentile output must carry a "demo / dataset-derived" label with a documented source — no real-rank claim
- [ ] `functions/api/location.js` returns coarse country/city only — never claim true city/neighborhood rank from IP
- [ ] `privacy.html` / `terms.html` / `methodology.html` stay updated before any public ads change

## NEVER

- Never add user accounts, saved records, tracking, or any data storage without an explicit privacy review + scope update
- Never introduce a database or backend state (the project is intentionally stateless)
- Never add an npm dependency or a build/bundler step to the MVP
- Never hardcode an AdSense publisher line — `ads.txt` stays a placeholder until AdSense approval
- Never present demo percentiles as real population ranking

## Stack / Structure

- **Stack**: Static HTML + CSS + Vanilla JS + Cloudflare Pages Functions
- **Deployment**: Cloudflare Pages — build command none, output dir `.`, functions dir `functions/`. Live: https://my1rm.pages.dev/
- **Calc logic**: `app.js` — Epley/Brzycki/Lombardi average, squat/bench/deadlift, SBD total, bodyweight ratios
- **Edge function**: `functions/api/location.js` — coarse geo label from Cloudflare request metadata (deploy-only, no effect when opening `index.html` directly)
- **Static pages**: `index.html` (UI), `methodology.html` / `privacy.html` / `terms.html` (compliance)
- **Site config**: `_headers`, `robots.txt`, `sitemap.xml`, `ads.txt`

## Definition of Done (Pre-PR Checklist)

- [ ] `node --check app.js && node --check functions/api/location.js` — 0 syntax errors
- [ ] `node tests/calculator.test.js` passes
- [ ] `index.html` opens standalone in a browser without console errors
- [ ] Percentile + location output stay labeled as demo / coarse (guardrails intact)

## Git Permissions (Common, cannot be overridden)
- Follow workspace root `AGENTS.md` section 3 and section 16 for Codex git permissions.
- Codex may create a local commit only through the root gated commit flow; `git push` remains forbidden.
- Task-specific review-only scopes may be stricter, but this project file must not globally override the root table.
## Multi-Platform Execution Context (Common)
- This project operates on the premise of Windows source files + WSL /mnt/c/... accessing the same files.
- External (laptop/mobile) work defaults to SSH -> WSL.
- Execution environment: **Windows default** (remote access via SSH -> WSL for editing, execution constraints follow project rules)
- When confused about paths, refer to the "Development Environment (Multi-Platform)" section in CLAUDE.md first.

<!-- BEGIN: CODEX_GIT_POLICY_BLOCK -->
## Codex Git Permissions (Workspace Policy)

Project-local rules inherit root `AGENTS.md` section 3 and section 16.

| Action | Claude Code/User | Codex |
| --- | :---: | :---: |
| Code modification | yes | yes |
| Build/test verification | yes | yes |
| `git commit` | yes | gated local only |
| `git push` | yes | forbidden |

- Codex may create a local commit only when the root workspace Codex commit gate passes for the task.
- Codex never pushes. Claude Code or the user handles push and integration ownership.
- If this project needs stricter review-only behavior for a task, state it in that task's scope; otherwise root policy wins.
<!-- END: CODEX_GIT_POLICY_BLOCK -->
