# My1RM Project Context

## Purpose

My1RM is a public mini-site for calculating estimated one-rep maxes for squat,
bench, and deadlift. The project is designed as a lightweight AdSense-ready
experiment that can be deployed to Cloudflare Pages. The calculator stays
client-side; visitors who opt into the ranking flow submit one anonymous result
to the Cloudflare D1 `records` store.

## Runtime

- Static HTML, CSS, and vanilla JavaScript.
- Cloudflare Pages Functions for anonymous funnel milestones and explicit
  anonymous ranking. The legacy location function remains for compatibility,
  but the current calculator does not call it.
- Cloudflare D1 stores ranking records defined by `schema.sql` and bound as
  `DB` in `wrangler.toml`.
- No package dependencies in the MVP and no account or login system.
- Ranking records contain a generated record ID and timestamp plus lift totals,
  selected sex/age band, coarse country/city, and a random per-tab session key
  used only for same-tab replacement. It is distinct from the analytics session
  key. No name, email, account ID, or raw IP is stored.

## Verification

Run from this directory:

```powershell
npm run check
```

`npm run check` performs module-typed stdin checks for both Pages Functions.

For UI smoke, open `index.html` directly or serve the directory with a local
static server. Pages Function endpoints are unavailable in standalone-file mode.

## Product Guardrails

- Do not claim true city or neighborhood rank from IP data.
- Percentiles must be labeled as demo or dataset-derived with documented source.
- Keep privacy, terms, and methodology pages updated before public ads go live.
- Do not expand the allowlisted analytics or ranking payloads without an explicit
  privacy review and task scope update.

## Reference Ledger
Web-research facts for this project accumulate in `docs/reference/`. Before re-fetching an
external source, run `python -X utf8 scripts/check-web-reference-ledger.py --query "<topic>"`
from the workspace root and prefer an existing doc whose `last_verified` is current; after
research that changes code or decisions, persist a doc with `last_verified` / `sources` /
`reliability` (primary | vendor-doc | analyst | secondary) frontmatter. Full rule + helpfulness
scoring: root CLAUDE.md "Web Research — Reference Ledger".
