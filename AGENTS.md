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

<!-- BEGIN: WORKSPACE_POLICY_INHERITANCE -->
## Workspace Policy Inheritance

Git/commit/push, task/lock, review, and handoff rules come from root
`AGENTS.md`; project rules only add stricter local constraints.
<!-- END: WORKSPACE_POLICY_INHERITANCE -->
