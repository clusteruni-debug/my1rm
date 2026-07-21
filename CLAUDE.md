# My1RM Project Context

## Purpose

My1RM is a public mini-site for calculating estimated one-rep maxes for squat,
bench, and deadlift. The project is designed as a lightweight AdSense-ready
experiment that can be deployed to Cloudflare Pages. The calculator stays
client-side; visitors who opt into the ranking flow submit one anonymous result
to the Cloudflare D1 `records` store.

## Runtime

- Static HTML, CSS, and vanilla JavaScript.
- Cloudflare Pages Functions for coarse request location and anonymous ranking.
- Cloudflare D1 stores ranking records defined by `schema.sql` and bound as
  `DB` in `wrangler.toml`.
- No package dependencies in the MVP and no account or login system.
- Ranking records contain a generated record ID and timestamp plus lift totals,
  selected sex/age band, and coarse country/city. No name, email, user ID, or raw IP is stored.

## Verification

Run from this directory:

```powershell
npm run check
Get-Content -Raw functions/api/rank.js | node --check --input-type=module
```

`rank.js` is ESM in a typeless package, so a bare `node --check functions/api/rank.js` is not an accepted substitute for the module-typed stdin check.

For UI smoke, open `index.html` directly or serve the directory with a local
static server. The Cloudflare location and ranking endpoints are deployment-only.

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
