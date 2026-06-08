// POST /api/rank — save one anonymous record, then return this lifter's standing.
// Region (country/city) comes from Cloudflare's edge metadata (request.cf);
// the raw IP is never read or stored.

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();

    const total = clampNum(body.total_kg);
    if (total <= 0) {
      return json({ error: 'invalid total' }, 400);
    }

    const sex = body.sex === 'female' ? 'female' : 'male';
    const ageBucket = String(body.age_bucket || '').slice(0, 16);
    const squat = clampNum(body.squat_kg);
    const bench = clampNum(body.bench_kg);
    const deadlift = clampNum(body.deadlift_kg);

    const cf = request.cf || {};
    const country = cf.country ? String(cf.country).slice(0, 4) : null;
    const city = cf.city ? String(cf.city).slice(0, 64) : null;

    // 1) save the record
    await env.DB.prepare(
      `INSERT INTO records (squat_kg, bench_kg, deadlift_kg, total_kg, sex, age_bucket, country, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(squat, bench, deadlift, total, sex, ageBucket, country, city).run();

    // 2) global percentile = how many recorded totals are below mine
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM records`).first();
    const belowRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM records WHERE total_kg < ?`)
      .bind(total)
      .first();
    const totalCount = (totalRow && totalRow.c) || 0;
    const below = (belowRow && belowRow.c) || 0;
    const percentile = totalCount > 0 ? Math.round((below / totalCount) * 100) : null;

    // 3) city standing = how many in my city are above me, +1 = my rank
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
      cityTotal = (cityCountRow && cityCountRow.c) || 0;
      cityRank = ((cityAboveRow && cityAboveRow.c) || 0) + 1;
    }

    return json({ ok: true, totalCount, percentile, city, country, cityRank, cityTotal });
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
