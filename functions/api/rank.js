// POST /api/rank — return a standing; external submissions save one anonymous record.
// Internal operator submissions return a no-store acknowledgement without querying D1.
// External standings exclude the current tab session before its row is replaced. Region
// (country/city) comes from Cloudflare request metadata; raw IP is never stored.

const ALLOWED_AGE_BUCKETS = ['under 18', '18-23', '24-34', '35-44', '45-54', '55-64', '65+'];
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{20,80}$/;
const MAX_BODY_BYTES = 1024;
const EXPECTED_KEYS = 'age_bucket,bench_kg,deadlift_kg,is_internal,session_id,sex,squat_kg,total_kg';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const contentType = (request.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      return json({ error: 'content type' }, 415);
    }

    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: 'origin' }, 403);
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: 'payload too large' }, 413);
    }

    let rawBody;
    try {
      rawBody = await request.text();
    } catch (_error) {
      return json({ error: 'invalid body' }, 400);
    }
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'payload too large' }, 413);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (_error) {
      return json({ error: 'invalid json' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'invalid payload' }, 400);
    }
    if (Object.keys(body).sort().join(',') !== EXPECTED_KEYS) {
      return json({ error: 'invalid payload' }, 400);
    }
    if (typeof body.session_id !== 'string' || !SESSION_ID_PATTERN.test(body.session_id)) {
      return json({ error: 'invalid session' }, 400);
    }
    if (body.sex !== 'male' && body.sex !== 'female') {
      return json({ error: 'invalid sex' }, 400);
    }
    if (!ALLOWED_AGE_BUCKETS.includes(body.age_bucket)) {
      return json({ error: 'invalid age bucket' }, 400);
    }
    if (typeof body.is_internal !== 'boolean') {
      return json({ error: 'invalid internal flag' }, 400);
    }

    const total = parseWeight(body.total_kg, 6000);
    const squat = parseWeight(body.squat_kg);
    const bench = parseWeight(body.bench_kg);
    const deadlift = parseWeight(body.deadlift_kg);
    if ([total, squat, bench, deadlift].some((value) => value == null)
      || Math.abs(total - (squat + bench + deadlift)) > 0.25) {
      return json({ error: 'invalid lifts' }, 400);
    }
    if (!env || !env.DB) return json({ error: 'server' }, 500);

    if (body.is_internal) {
      return json({
        ok: true,
        stored: false,
        percentile: null,
        cohortTotal: 0,
      });
    }

    const sessionId = body.session_id;
    const sex = body.sex;
    const ageBucket = body.age_bucket;

    const cf = request.cf || {};
    const country = cf.country ? String(cf.country).slice(0, 4) : null;
    const city = cf.city ? String(cf.city).slice(0, 64) : null;

    // --- standings computed against EXISTING rows (self excluded) ---

    // percentile within the same sex + age band (cohort)
    const cohortCountRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM records WHERE sex = ? AND age_bucket = ? AND (session_id IS NULL OR session_id <> ?)`)
      .bind(sex, ageBucket, sessionId)
      .first();
    const cohortBelowRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM records WHERE sex = ? AND age_bucket = ? AND total_kg < ? AND (session_id IS NULL OR session_id <> ?)`)
      .bind(sex, ageBucket, total, sessionId)
      .first();
    const cohortCount = (cohortCountRow && cohortCountRow.c) || 0;
    const cohortBelow = (cohortBelowRow && cohortBelowRow.c) || 0;
    const percentile = cohortCount > 0 ? Math.round((cohortBelow / cohortCount) * 100) : null;

    await env.DB.prepare(
      `INSERT OR REPLACE INTO records (session_id, squat_kg, bench_kg, deadlift_kg, total_kg, sex, age_bucket, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(sessionId, squat, bench, deadlift, total, sex, ageBucket, country, city).run();

    return json({
      ok: true,
      stored: true,
      percentile,
      cohortTotal: cohortCount + 1, // include self for the "N people" label
    });
  } catch (_err) {
    return json({ error: 'server' }, 500);
  }
}

function parseWeight(value, max = 2000) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  return Math.round(n * 100) / 100;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
