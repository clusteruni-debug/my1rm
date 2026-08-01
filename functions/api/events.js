// POST /api/events — store one allowlisted anonymous funnel milestone.
// The client sends only a per-tab session ID and an event name. Exercise,
// body, demographic, location, and IP values are neither accepted nor stored.

const ALLOWED_EVENTS = new Set([
  'page_view',
  'calculator_started',
  'estimate_completed',
  'percentile_viewed',
  'rank_submit_attempt',
  'rank_submit_success',
  'rank_submit_failure',
]);
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{20,80}$/;
const MAX_BODY_BYTES = 512;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: 'payload too large' }, 413);
    }

    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return json({ error: 'invalid json' }, 400);
    }

    const validationError = validatePayload(body);
    if (validationError) return json({ error: validationError }, 400);
    if (!env || !env.DB) return json({ error: 'server' }, 500);

    await env.DB.prepare(
      `INSERT OR IGNORE INTO behavior_events (session_id, event_name, is_internal)
       VALUES (?, ?, 0)`,
    ).bind(body.session_id, body.event_name).run();

    return new Response(null, {
      status: 204,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (_error) {
    return json({ error: 'server' }, 500);
  }
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'invalid payload';
  const keys = Object.keys(body).sort();
  if (keys.length !== 2 || keys[0] !== 'event_name' || keys[1] !== 'session_id') return 'invalid payload';
  if (typeof body.session_id !== 'string' || !SESSION_ID_PATTERN.test(body.session_id)) return 'invalid session';
  if (typeof body.event_name !== 'string' || !ALLOWED_EVENTS.has(body.event_name)) return 'invalid event';
  return null;
}

function json(value, status) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}