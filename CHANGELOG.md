# My1RM Changelog

## 2026-07-22

- Reconciled project guidance and the domain map with the shipped anonymous D1 ranking path.
- Added a module-aware `rank.js` syntax gate after the bare file check failed to reject malformed ESM under Node 24.13.1.

## 2026-06-15

- Added project-standard documentation surfaces for workspace-wide consistency.
- Default verification remains `npm run check`.
- Added `agent_docs/test-scenarios.md` so calculator correctness, rank isolation, localization, and deployment smoke checks are reusable.
- Added `docs/deploy.md` to capture the Cloudflare Pages/static-site deployment path and post-deploy smoke expectations.
- Added an initial data-schema exemption note; superseded on 2026-07-22 after the D1 ranking path was reconciled.
- This pass did not alter calculator formulas, location/privacy behavior, or public deployment configuration.
- Future formula, standards-table, or rank-classification changes should update both test scenarios and this changelog in the same task.

## 2026-06-09

- Shipped the opt-in anonymous visitor ranking flow backed by the Cloudflare D1 `records` table.
- Records store the submitted lift result, selected sex/age band, generated ID/timestamp, and coarse country/city; they exclude names, email addresses, accounts, user IDs, and raw IP addresses.
