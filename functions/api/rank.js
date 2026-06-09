// POST /api/rank — save one anonymous record, then return this lifter's standing.
// Standings are computed BEFORE inserting the new row, so a lifter is never
// counted in their own rank. Region (country/city) comes from Cloudflare's
// edge metadata (request.cf); the raw IP is never read or stored.

const ALLOWED_AGE_BUCKETS = ['under 18', '18-23', '24-34', '35-44', '45-54', '55-64', '65+'];

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();

    const total = clampNum(body.total_kg);
    if (total <= 0) {
      return json({ error: 'invalid total' }, 400);
    }

    const sex = body.sex === 'female' ? 'female' : 'male';
    const ageBucket = ALLOWED_AGE_BUCKETS.includes(body.age_bucket) ? body.age_bucket : '24-34';
    const squat = clampNum(body.squat_kg);
    const bench = clampNum(body.bench_kg);
    const deadlift = clampNum(body.deadlift_kg);

    const cf = request.cf || {};
    const country = cf.country ? String(cf.country).slice(0, 4) : null;
    const city = cf.city ? String(cf.city).slice(0, 64) : null;

    // --- standings computed against EXISTING rows (self excluded) ---

    // percentile within the same sex + age band (cohort)
    const cohortCountRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM records WHERE sex = ? AND age_bucket = ?`)
      .bind(sex, ageBucket)
      .first();
    const cohortBelowRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM records WHERE sex = ? AND age_bucket = ? AND total_kg < ?`)
      .bind(sex, ageBucket, total)
      .first();
    const cohortCount = (cohortCountRow && cohortCountRow.c) || 0;
    const cohortBelow = (cohortBelowRow && cohortBelowRow.c) || 0;
    const percentile = cohortCount > 0 ? Math.round((cohortBelow / cohortCount) * 100) : null;

    // city standing
    let cityRank = null;
    let cityTotal = null;
    if (city) {
      const cityCountRow = await env.DB
        .prepare(`SELECT COUNT(*) AS c FROM records WHERE city = ?`)
        .bind(city)
        .first();
      const cityAboveRow = await env.DB
        .prepare(`SELECT COUNT(*) AS c FROM records WHERE city = ? AND total_kg > ?`)
        .bind(city, total)
        .first();
      cityTotal = ((cityCountRow && cityCountRow.c) || 0) + 1; // include self
      cityRank = ((cityAboveRow && cityAboveRow.c) || 0) + 1;
    }

    // --- now persist this lifter's record ---
    await env.DB.prepare(
      `INSERT INTO records (squat_kg, bench_kg, deadlift_kg, total_kg, sex, age_bucket, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(squat, bench, deadlift, total, sex, ageBucket, country, city).run();

    return json({
      ok: true,
      percentile,
      cohortTotal: cohortCount + 1, // include self for the "N people" label
      sex,
      ageBucket,
      city,
      country,
      cityRank,
      cityTotal,
    });
  } catch (_err) {
    return json({ error: 'server' }, 500);
  }
}

function clampNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(2000, Math.round(n * 100) / 100);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}
