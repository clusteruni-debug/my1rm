# My1RM

Static Cloudflare Pages MVP for a squat, bench, and deadlift one-rep max calculator.

## Scope

- Estimate 1RM from working sets using an average of Epley, Brzycki, and Lombardi.
- Show squat, bench, deadlift, SBD total, and bodyweight ratios.
- Show a transparent demo percentile model by sex and age band.
- Use a Cloudflare Pages Function at `/api/location` for coarse country/city labels.
- Include privacy, terms, methodology, robots, sitemap, and ads.txt placeholders.

## Non-goals

- No account system — ranking records are anonymous (no name, email, or user id).
- No raw IP stored — leaderboards use coarse city/country from the connection only, no street-level tracking.
- No medical, coaching, or competition judging claim.
- No build step or npm dependency in the front-end MVP (D1 runs server-side in Pages Functions).

## Local verification

```bash
node --check app.js
node --check functions/api/location.js
node tests/calculator.test.js
```

Open `index.html` directly in a browser for the static UI. The location endpoint
only returns Cloudflare metadata after deployment through Cloudflare Pages.

## Cloudflare Pages

- Project root: `projects/my1rm`
- Build command: none
- Build output directory: `.`
- Functions directory: `functions`

After AdSense approval, replace `ads.txt` with the publisher-specific line from
Google AdSense.
