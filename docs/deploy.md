# Deploy - My1RM

Target: Cloudflare Pages.

## Local Static Run

Open `index.html` directly or serve the folder with a static server.

## Verify

```powershell
npm run check
```

## Cloudflare

Relevant files:

- `wrangler.toml`
- `_headers`
- `functions/api/location.js`
- `robots.txt`
- `sitemap.xml`

## Smoke

1. Calculator works on the deployed URL.
2. Location API is opt-in and handles denial.
3. Privacy, terms, methodology, robots, and sitemap routes are reachable.

