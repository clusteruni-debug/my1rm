# My1RM — CC/CX File Ownership

| Domain | File/Directory | Owner | Rationale |
|--------|---------------|:-----:|-----------|
| Calc Logic | `app.js` (1RM estimation, SBD total, ratios) | CC | Core business logic + formula correctness |
| Edge Function | `functions/api/location.js` | CC | Cloudflare runtime + geo handling |
| Tests | `tests/calculator.test.js` | CC | Formula regression |
| UI / Markup | `index.html`, `styles.css` | CX | Static presentation |
| Compliance Pages | `methodology.html`, `privacy.html`, `terms.html` | CX | Copy-heavy static pages |
| Site Config | `_headers`, `robots.txt`, `sitemap.xml`, `ads.txt` | Manual | Deploy / SEO / AdSense config |
