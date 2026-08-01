import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');
const endpointPath = path.join(projectRoot, 'functions', 'api', 'events.js');
const endpointSource = await readFile(endpointPath, 'utf8');
const endpointModule = await import(`data:text/javascript;base64,${Buffer.from(endpointSource).toString('base64')}`);
const { onRequestPost } = endpointModule;

const ALLOWED_EVENTS = [
  'page_view',
  'calculator_started',
  'estimate_completed',
  'percentile_viewed',
  'rank_submit_attempt',
  'rank_submit_success',
  'rank_submit_failure',
];

function mockDb() {
  const capture = { queries: [], binds: [], runs: 0 };
  return {
    capture,
    DB: {
      prepare(sql) {
        capture.queries.push(sql);
        return {
          bind(...values) {
            capture.binds.push(values);
            return this;
          },
          async run() {
            capture.runs += 1;
            return { success: true };
          },
        };
      },
    },
  };
}

function requestWith(body, headers = {}) {
  return new Request('https://my1rm.test/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

for (const [index, eventName] of ALLOWED_EVENTS.entries()) {
  const { DB, capture } = mockDb();
  const sessionId = `session_${String(index).padStart(2, '0')}_12345678901234567890`;
  const response = await onRequestPost({
    request: requestWith({ session_id: sessionId, event_name: eventName }),
    env: { DB },
  });
  assert.equal(response.status, 204, `${eventName} should be accepted`);
  assert.equal(capture.runs, 1);
  assert.match(capture.queries[0], /INSERT OR IGNORE INTO behavior_events/);
  assert.deepEqual(capture.binds[0], [sessionId, eventName]);
}

for (const invalidPayload of [
  { session_id: 'short', event_name: 'page_view' },
  { session_id: 'session_12345678901234567890', event_name: 'raw_weight_entered' },
  { session_id: 'session_12345678901234567890', event_name: 'page_view', total_kg: 500 },
  ['session_12345678901234567890', 'page_view'],
]) {
  const { DB, capture } = mockDb();
  const response = await onRequestPost({ request: requestWith(invalidPayload), env: { DB } });
  assert.equal(response.status, 400);
  assert.equal(capture.runs, 0, 'invalid payload must not reach D1');
}

{
  const { DB, capture } = mockDb();
  const response = await onRequestPost({ request: requestWith('{'), env: { DB } });
  assert.equal(response.status, 400);
  assert.equal(capture.runs, 0);
}

{
  const { DB, capture } = mockDb();
  const response = await onRequestPost({
    request: requestWith({}, { 'content-length': '513' }),
    env: { DB },
  });
  assert.equal(response.status, 413);
  assert.equal(capture.runs, 0);
}

{
  const response = await onRequestPost({
    request: requestWith({
      session_id: 'session_12345678901234567890',
      event_name: 'page_view',
    }),
    env: {},
  });
  assert.equal(response.status, 500);
}

const schema = await readFile(path.join(projectRoot, 'schema.sql'), 'utf8');
const tableMatch = schema.match(/CREATE TABLE IF NOT EXISTS behavior_events \(([\s\S]*?)\n\);/);
assert.ok(tableMatch, 'behavior_events table must exist');
const behaviorTable = tableMatch[1].toLowerCase();
for (const forbidden of ['squat', 'bench', 'deadlift', 'bodyweight', 'sex', 'age_bucket', 'country', 'city']) {
  assert.equal(behaviorTable.includes(forbidden), false, `behavior table must not contain ${forbidden}`);
}
assert.doesNotMatch(behaviorTable, /\bip\b/);
assert.match(behaviorTable, /unique \(session_id, event_name\)/);
for (const eventName of ALLOWED_EVENTS) assert.match(behaviorTable, new RegExp(`'${eventName}'`));

const report = await readFile(path.join(projectRoot, 'scripts', 'analytics-report.sql'), 'utf8');
assert.match(report, /WHERE is_internal = 0/);
assert.match(report, /COUNT\(DISTINCT session_id\)/);
assert.match(report, /rank_submit_success/);
assert.match(report, /rank_submit_failure/);

const privacy = await readFile(path.join(projectRoot, 'privacy.html'), 'utf8');
assert.match(privacy, /random per-tab session ID/i);
assert.match(privacy, /rejects exercise weights, bodyweight, sex, age,\s*location, raw IP/i);

console.log('analytics.test.mjs: PASS');