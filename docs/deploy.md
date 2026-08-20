# Deploy - My1RM

Target: Cloudflare Pages with D1 binding `DB`.

## Verify

Run from `projects/my1rm`:

```powershell
npm run check
```

The check first builds an allowlisted `dist` directory, then covers `app.js`,
both active Pages Functions, calculator tests, event contract tests,
ranking/upsert tests, the public asset manifest, and the one-time migration
against a legacy in-memory schema. Run the rendered browser smoke separately
before deployment.

## Apply D1 schema

Inspect the deployed `records` table first:

```powershell
npx --yes wrangler@latest d1 execute my1rm --remote --command="PRAGMA table_info(records);"
```

If the existing table has no `session_id` column, apply the one-time migration,
then the full schema:

```powershell
npx --yes wrangler@latest d1 execute my1rm --remote --file=migrations/0002_rank_session_id.sql
npx --yes wrangler@latest d1 execute my1rm --remote --file=schema.sql
```

Do not rerun the migration after the column exists. For a fresh database, run
only `schema.sql`. Legacy ranking rows remain unchanged and nullable; new rows
are unique per random tab session.

## Deploy Pages

```powershell
npm run build
npx --yes wrangler@latest pages deploy dist --project-name=my1rm
```

Never deploy the repository root. `scripts/build-public.mjs` copies exactly
these public files into `dist`:

- `_headers`
- `ads.txt`
- `app.js`
- `favicon.svg`
- `index.html`
- `methodology.html`
- `privacy.html`
- `robots.txt`
- `sitemap.xml`
- `styles.css`
- `terms.html`

Wrangler builds Pages Functions from the repository's `functions` directory;
`functions/api/location.js` remains available for backward compatibility, but
the current calculator does not call it. Internal docs, tests, SQL, migrations,
and Wrangler configuration are not copied to `dist`.

## Live smoke

1. Open `https://my1rm.pages.dev/?internal=1` on the operator browser.
2. Confirm all three lift fields start blank and have distinct accessible names.
3. Confirm each row estimates independently and the total waits for all three.
4. Confirm the demo percentile waits for sex, age, and bodyweight.
5. Submit a rank, change one input during a delayed second request, and confirm
   the stale response does not repaint.
6. Submit a rank in that internal browser, change one input, and submit again.
   Confirm the UI says `저장 안 함`, both responses have `stored: false`, and the
   D1 `records` count does not change.
7. Confirm the internal requests do not query cohort standings, internal
   milestones have `is_internal = 1`, and every report omits them.
8. POST invalid content type, cross-origin, extra-field, and oversized payloads
   to both endpoints and confirm they are rejected.
9. Confirm privacy, terms, methodology, robots, and sitemap routes are reachable.
10. Confirm internal Markdown, SQL, tests, scripts, and Wrangler config are not
    served as static Pages assets.

The same-session external upsert is covered by `npm run check`. Do not create an
external production smoke row just to repeat that test.

See `docs/analytics.md` for the event contract, browser flag, migration order,
and report interpretation.
