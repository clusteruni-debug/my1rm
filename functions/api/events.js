// POST /api/events — store one allowlisted anonymous funnel milestone.
// The client sends a per-tab session ID, an event name, and a client-asserted
// internal flag. Exercise, body, demographic, location, and IP data are rejected.

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

    const validationError = validatePayload(body);
    if (validationError) return json({ error: validationError }, 400);
    if (!env || !env.DB) return json({ error: 'server' }, 500);

    await env.DB.prepare(
      `INSERT OR IGNORE INTO behavior_events (session_id, event_name, is_internal)
       VALUES (?, ?, ?)`,
    ).bind(body.session_id, body.event_name, body.is_internal ? 1 : 0).run();

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
  if (keys.join(',') !== 'event_name,is_internal,session_id') return 'invalid payload';
  if (typeof body.session_id !== 'string' || !SESSION_ID_PATTERN.test(body.session_id)) return 'invalid session';
  if (typeof body.event_name !== 'string' || !ALLOWED_EVENTS.has(body.event_name)) return 'invalid event';
  if (typeof body.is_internal !== 'boolean') return 'invalid internal flag';
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