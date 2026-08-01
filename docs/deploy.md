# Deploy - My1RM

Target: Cloudflare Pages with D1 binding `DB`.

## Verify

Run from `projects/my1rm`:

```powershell
npm run check
Get-Content -Raw functions/api/rank.js | node --check --input-type=module
Get-Content -Raw functions/api/events.js | node --check --input-type=module
node tests/analytics.test.mjs
```

Open `index.html` directly or run the browser smoke before deploying.

## Apply D1 schema

```powershell
npx --yes wrangler@latest d1 execute my1rm-db --remote --file=schema.sql
```

The schema is idempotent. It preserves `records` and adds the anonymous
`behavior_events` funnel table.

## Deploy Pages

```powershell
npx --yes wrangler@latest pages deploy . --project-name=my1rm
```

Relevant runtime files:

- `wrangler.toml`
- `_headers`
- `functions/api/events.js`
- `functions/api/rank.js`
- `functions/api/location.js`
- `schema.sql`

## Live smoke

1. Open `https://my1rm.pages.dev/?internal=1` on the operator browser.
2. Confirm all three lift fields start blank.
3. Confirm each row estimates independently and the total waits for all three.
4. Confirm the demo percentile waits for sex, age, and bodyweight.
5. Confirm ranking stays disabled until the percentile inputs are complete and
   submits only after the button is pressed.
6. POST an invalid event payload and confirm `/api/events` returns `400` without
   inserting a row.
7. Run `scripts/analytics-report.sql` and confirm internal sessions are absent.
8. Confirm privacy, terms, methodology, robots, and sitemap routes are reachable.

See `docs/analytics.md` for the event contract, internal-device flag, and report
interpretation.