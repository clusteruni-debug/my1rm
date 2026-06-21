# My1RM Project Context

## Purpose

My1RM is a public mini-site for calculating estimated one-rep maxes for squat,
bench, and deadlift. The project is designed as a lightweight AdSense-ready
experiment that can be deployed to Cloudflare Pages without a backend database.

## Runtime

- Static HTML, CSS, and vanilla JavaScript.
- Cloudflare Pages Functions for coarse request location only.
- No package dependencies in the MVP.
- No account, saved records, or DB schema.

## Verification

Run from this directory:

```bash
node --check app.js
node --check functions/api/location.js
node tests/calculator.test.js
```

For UI smoke, open `index.html` directly or serve the directory with a local
static server. The Cloudflare location endpoint is deployment-only.

## Product Guardrails

- Do not claim true city or neighborhood rank from IP data.
- Percentiles must be labeled as demo or dataset-derived with documented source.
- Keep privacy, terms, and methodology pages updated before public ads go live.
- Do not add tracking, user accounts, or data storage without an explicit privacy
  review and task scope update.

## Reference Ledger
Web-research facts for this project accumulate in `docs/reference/`. Before re-fetching an
external source, run `python -X utf8 scripts/check-web-reference-ledger.py --query "<topic>"`
from the workspace root and prefer an existing doc whose `last_verified` is current; after
research that changes code or decisions, persist a doc with `last_verified` / `sources` /
`reliability` (primary | vendor-doc | analyst | secondary) frontmatter. Full rule + helpfulness
scoring: root CLAUDE.md "Web Research — Reference Ledger".
