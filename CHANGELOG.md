# My1RM Changelog

## 2026-06-15

- Added project-standard documentation surfaces for workspace-wide consistency.
- Default verification remains `npm run check`.
- Added `agent_docs/test-scenarios.md` so calculator correctness, rank isolation, localization, and deployment smoke checks are reusable.
- Added `docs/deploy.md` to capture the Cloudflare Pages/static-site deployment path and post-deploy smoke expectations.
- Documented that the mini-site has no project-owned shared database in the standard data-schema exemption path.
- This pass did not alter calculator formulas, location/privacy behavior, or public deployment configuration.
- Future formula, standards-table, or rank-classification changes should update both test scenarios and this changelog in the same task.
