# My1RM — AGENTS.md

> Global rules: see workspace root `AGENTS.md` and `config/codex-global/RUNTIME-CONTRACT.md`.
> Detailed context: See `CLAUDE.md`

## MUST (PR rejected if violated)

- [ ] Keep the MVP install-free — static HTML/CSS/vanilla JS only, no front-end bundler or package dependencies; the build only copies an allowlist into `dist`
- [ ] 1RM estimation must stay the documented Epley / Brzycki / Lombardi average — no silent formula swap
- [ ] Percentile output must carry a "demo / dataset-derived" label with a documented source — no real-rank claim
- [ ] `functions/api/location.js` returns coarse country/city only — never claim true city/neighborhood rank from IP
- [ ] `privacy.html` / `terms.html` / `methodology.html` stay updated before any public ads change

## NEVER

- Never add user accounts or personal login — ranking records stay anonymous (no name, no email, no user id)
- Never store the raw client IP — region (city/country) comes from `request.cf` and the IP is discarded
- Never add an npm dependency or a front-end bundler (D1 access runs server-side in Pages Functions); `npm run build` only packages the static allowlist
- Never hardcode an AdSense publisher line — `ads.txt` stays a placeholder until AdSense approval
- Never present demo percentiles as real population ranking

## Stack / Structure

- **Stack**: Static HTML + CSS + Vanilla JS + Cloudflare Pages Functions
- **Deployment**: Cloudflare Pages — build command `npm run build`, output dir `dist`, functions dir `functions/`. Live: https://my1rm.pages.dev/
- **Calc logic**: `app.js` — Epley/Brzycki/Lombardi average, squat/bench/deadlift, SBD total, bodyweight ratios
- **Edge functions**: `functions/api/events.js` (anonymous milestones) and
  `functions/api/rank.js` (explicit ranking submission). `location.js` is
  retained for compatibility; the current calculator does not call it.
- **Static pages**: `index.html` (UI), `methodology.html` / `privacy.html` / `terms.html` (compliance)
- **Site config**: `_headers`, `robots.txt`, `sitemap.xml`, `ads.txt`

## Definition of Done (Pre-PR Checklist)

- [ ] `npm run check` — app/API syntax plus calculator, analytics, and rank tests pass
- [ ] `index.html` opens standalone in a browser without console errors
- [ ] Percentile output stays labeled as demo and ranking remains explicit-submit

## Git Permissions (Common, cannot be overridden)
- Follow workspace root `AGENTS.md` section 3 and section 16 for Codex git permissions.
- Codex may create a local commit only through the root gated commit flow; `git push` remains forbidden.
- Task-specific review-only scopes may be stricter, but this project file must not globally override the root table.
## Multi-Platform Execution Context (Common)
- This project operates on the premise of Windows source files + WSL /mnt/c/... accessing the same files.
- External (laptop/mobile) work defaults to SSH -> WSL.
- Execution environment: **Windows default** (remote access via SSH -> WSL for editing, execution constraints follow project rules)
- When confused about paths, refer to the "Development Environment (Multi-Platform)" section in CLAUDE.md first.
<!-- BEGIN: WORKSPACE_POLICY_INHERITANCE -->
## Workspace Policy Inheritance

Git/commit/push, task/lock, review, and handoff rules come from root
`AGENTS.md`; project rules only add stricter local constraints.
<!-- END: WORKSPACE_POLICY_INHERITANCE -->
