# My1RM Test Scenarios

## 1. Calculator
- Select squat, bench, and deadlift.
- Enter weight/reps.
- Estimated 1RM updates.
- Invalid input fails visibly without broken layout.

## 2. Unit / Rank Isolation
- Unit changes do not mix kg/lb values.
- Lift-specific rank logic does not leak across lifts.

## 3. Privacy / Location
- Location lookup is opt-in.
- Denied or failed location still leaves calculator usable.
- No exact user location is displayed unnecessarily.

## 4. Static Site
- `npm run check` passes.
- `index.html`, `app.js`, and Cloudflare function checks pass.

