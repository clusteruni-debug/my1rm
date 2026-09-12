# My1RM — Domain and Coordination Map

Use this map for technical boundaries. The active task and file locks name the
assignee; model names do not reserve files. The session lead coordinates coupled
architecture and integration work and may delegate bounded slices. Explicit user
assignments and protected-operation approvals remain binding; root `AGENTS.md`
owns review and Git rules.

| Domain | File/Directory | Coordination | Rationale |
|--------|---------------|:-----:|-----------|
| Calc Logic | `app.js` (1RM estimation, SBD total, ratios) | Session lead | Core business logic + formula correctness |
| Edge Function | `functions/api/location.js` | Session lead | Cloudflare runtime + geo handling |
| Ranking API | `functions/api/rank.js` | Session lead | Anonymous D1 write path + percentile and regional standing contract |
| D1 Schema | `schema.sql` | Session lead | `records` table and ranking-query indexes |
| Cloudflare Config | `wrangler.toml` | Manual | Pages output and D1 `DB` binding |
| Tests | `tests/calculator.test.js` | Session lead | Formula regression |
| UI / Markup | `index.html`, `styles.css` | Bounded task assignee | Static presentation |
| Compliance Pages | `methodology.html`, `privacy.html`, `terms.html` | Bounded task assignee | Copy-heavy static pages |
| Site Config | `_headers`, `robots.txt`, `sitemap.xml`, `ads.txt` | Manual | Deploy / SEO / AdSense config |
