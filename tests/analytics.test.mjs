import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildPublic, PUBLIC_FILES } from '../scripts/build-public.mjs';

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

function requestWith(body, headers = {}, url = 'https://my1rm.test/api/events') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

for (const [index, eventName] of ALLOWED_EVENTS.entries()) {
  for (const isInternal of [false, true]) {
    const { DB, capture } = mockDb();
    const sessionId = `session_${String(index).padStart(2, '0')}_12345678901234567890`;
    const response = await onRequestPost({
      request: requestWith({
        session_id: sessionId,
        event_name: eventName,
        is_internal: isInternal,
      }),
      env: { DB },
    });
    assert.equal(response.status, 204, `${eventName} should be accepted`);
    assert.equal(capture.runs, 1);
    assert.match(capture.queries[0], /INSERT OR IGNORE INTO behavior_events/);
    assert.deepEqual(capture.binds[0], [sessionId, eventName, isInternal ? 1 : 0]);
  }
}

for (const invalidPayload of [
  { session_id: 'short', event_name: 'page_view', is_internal: false },
  { session_id: 'session_12345678901234567890', event_name: 'raw_weight_entered', is_internal: false },
  { session_id: 'session_12345678901234567890', event_name: 'page_view', is_internal: false, total_kg: 500 },
  { session_id: 'session_12345678901234567890', event_name: 'page_view' },
  { session_id: 'session_12345678901234567890', event_name: 'page_view', is_internal: 1 },
  ['session_12345678901234567890', 'page_view', false],
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
    request: requestWith('{}', { 'content-type': 'text/plain' }),
    env: { DB },
  });
  assert.equal(response.status, 415);
  assert.equal(capture.runs, 0);
}

{
  const { DB, capture } = mockDb();
  const response = await onRequestPost({
    request: requestWith(
      { session_id: 'session_12345678901234567890', event_name: 'page_view', is_internal: false },
      { origin: 'https://attacker.test' },
    ),
    env: { DB },
  });
  assert.equal(response.status, 403);
  assert.equal(capture.runs, 0);
}

{
  const { DB, capture } = mockDb();
  const response = await onRequestPost({
    request: requestWith(`{"pad":"${'x'.repeat(600)}"}`),
    env: { DB },
  });
  assert.equal(response.status, 413);
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
      is_internal: false,
    }),
    env: {},
  });
  assert.equal(response.status, 500);
}

const schema = await readFile(path.join(projectRoot, 'schema.sql'), 'utf8');
const behaviorMatch = schema.match(/CREATE TABLE IF NOT EXISTS behavior_events \(([\s\S]*?)\n\);/);
assert.ok(behaviorMatch, 'behavior_events table must exist');
const behaviorTable = behaviorMatch[1].toLowerCase();
for (const forbidden of ['squat', 'bench', 'deadlift', 'bodyweight', 'sex', 'age_bucket', 'country', 'city']) {
  assert.equal(behaviorTable.includes(forbidden), false, `behavior table must not contain ${forbidden}`);
}
assert.doesNotMatch(behaviorTable, /\bip\b/);
assert.match(behaviorTable, /unique \(session_id, event_name\)/);
assert.match(behaviorTable, /is_internal integer not null default 0/);
for (const eventName of ALLOWED_EVENTS) assert.match(behaviorTable, new RegExp(`'${eventName}'`));

const recordsMatch = schema.match(/CREATE TABLE IF NOT EXISTS records \(([\s\S]*?)\n\);/);
assert.ok(recordsMatch, 'records table must exist');
assert.match(recordsMatch[1], /session_id TEXT CHECK/i);
assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS idx_records_session[\s\S]*WHERE session_id IS NOT NULL/i);

const report = await readFile(path.join(projectRoot, 'scripts', 'analytics-report.sql'), 'utf8');
assert.match(report, /WHERE is_internal = 0/);
assert.match(report, /JOIN page_views USING \(session_id\)/);
assert.match(report, /JOIN rank_attempts USING \(session_id\)/);
assert.match(report, /AS active_sessions/);
assert.match(report, /date\([^\n]+, '\+9 hours'\)/);
assert.match(report, /rank_submit_success/);
assert.match(report, /rank_submit_failure/);

const privacy = await readFile(path.join(projectRoot, 'privacy.html'), 'utf8');
assert.match(privacy, /random per-tab session ID/i);
assert.match(privacy, /client-asserted internal flag/i);
assert.match(privacy, /rejects exercise weights, bodyweight, sex, age,\s*location, raw IP/i);
assert.match(privacy, /Cloudflare Pages Web Analytics/i);
assert.match(privacy, /does not collect or use visitors'\s*personal data/i);
assert.match(privacy, /does not query aggregate standing data or save an operator ranking\s+submission/i);

const appSource = await readFile(path.join(projectRoot, 'app.js'), 'utf8');
assert.match(appSource, /const ANALYTICS_SESSION_KEY/);
assert.match(appSource, /const RANK_SESSION_KEY/);
assert.match(appSource, /session_id: analyticsSessionId\(\)/);
assert.match(appSource, /session_id: rankSessionId\(\)/);
assert.match(appSource, /sessionStorage\.removeItem\(ANALYTICS_SESSION_KEY\)/);
assert.match(appSource, /function render\(\) \{\s*trackMilestone\('page_view'\)/);
assert.match(appSource, /function convertUnits\(\) \{\s*invalidateRankResult\(\)/);
assert.match(appSource, /age_bucket: getAgeBucket\([^\n]+\)\.label,\s*is_internal: isInternalDevice\(\)/);
assert.match(appSource, /padEnd\(11, '0'\)/);
assert.match(appSource, /const controller = new AbortController\(\)/);
assert.equal((appSource.match(/requestVersion !== rankRequestVersion/g) || []).length, 3);
assert.ok(
  appSource.indexOf('if (requestVersion !== rankRequestVersion) return;\n      renderRank(rankData);')
    < appSource.indexOf('rankSubmitted = true;'),
  'rank result must be version-checked before rendering or marking success',
);
assert.match(appSource, /const EVENT_MAX_ATTEMPTS = 3/);
assert.match(appSource, /response\.status >= 400 && response\.status < 500[\s\S]*?rememberEvent\(eventName\)/);
assert.match(appSource, /Stop later render\(\) calls[\s\S]*?rememberEvent\(eventName\)/);

await buildPublic();
const expectedPublicFiles = [...PUBLIC_FILES].sort();
const builtPublicFiles = (await readdir(path.join(projectRoot, 'dist'))).sort();
assert.deepEqual(builtPublicFiles, expectedPublicFiles);
const builtPublicSet = new Set(builtPublicFiles);
for (const htmlFile of PUBLIC_FILES.filter((file) => file.endsWith('.html'))) {
  const html = await readFile(path.join(projectRoot, 'dist', htmlFile), 'utf8');
  const baseUrl = new URL(htmlFile, 'https://my1rm.test/');
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const reference = match[1];
    if (reference.startsWith('#') || reference.startsWith('data:')) continue;
    const resolved = new URL(reference, baseUrl);
    if (resolved.origin !== baseUrl.origin || resolved.pathname.startsWith('/api/')) continue;
    const relativePath = decodeURIComponent(resolved.pathname).replace(/^\/+/, '') || 'index.html';
    const publicPath = builtPublicSet.has(relativePath) ? relativePath : `${relativePath}.html`;
    assert.ok(builtPublicSet.has(publicPath), `${htmlFile} references missing public file ${relativePath}`);
  }
}
for (const forbiddenPath of [
  'AGENTS.md',
  'CLAUDE.md',
  'schema.sql',
  'wrangler.toml',
  'package.json',
]) {
  assert.equal(builtPublicFiles.includes(forbiddenPath), false, `${forbiddenPath} must not enter the Pages bundle`);
}

const assetsIgnore = await readFile(path.join(projectRoot, '.assetsignore'), 'utf8');
assert.match(assetsIgnore, /Pages deploys only the allowlisted dist output/);
const wranglerConfig = await readFile(path.join(projectRoot, 'wrangler.toml'), 'utf8');
assert.match(wranglerConfig, /database_name\s*=\s*"my1rm"/);
assert.match(wranglerConfig, /pages_build_output_dir\s*=\s*"dist"/);

const reportDb = new DatabaseSync(':memory:');
reportDb.exec(schema);
const insertEvent = reportDb.prepare(
  'INSERT INTO behavior_events (session_id, event_name, is_internal) VALUES (?, ?, ?)',
);
const fullSession = 'report_full_12345678901234567890';
for (const eventName of [
  'page_view',
  'calculator_started',
  'estimate_completed',
  'percentile_viewed',
  'rank_submit_attempt',
  'rank_submit_success',
]) {
  insertEvent.run(fullSession, eventName, 0);
}
insertEvent.run('report_orphan_start_1234567890123', 'calculator_started', 0);
insertEvent.run('report_skipped_stage_123456789012', 'page_view', 0);
insertEvent.run('report_skipped_stage_123456789012', 'percentile_viewed', 0);
for (const eventName of ['page_view', 'calculator_started', 'estimate_completed']) {
  insertEvent.run('report_internal_12345678901234567', eventName, 1);
}

const reportStatements = report
  .split(/;\s*(?=-- [234]\))/)
  .map((statement) => statement.trim())
  .filter(Boolean);
assert.equal(reportStatements.length, 4);
const reportRows = reportStatements.map((statement) => reportDb.prepare(statement).all());

const funnelCounts = new Map(reportRows[0].map((row) => [row.event_name, row.sessions]));
assert.equal(funnelCounts.get('page_view'), 2);
assert.equal(funnelCounts.get('calculator_started'), 1);
assert.equal(funnelCounts.get('estimate_completed'), 1);
assert.equal(funnelCounts.get('percentile_viewed'), 1);
assert.equal(funnelCounts.get('rank_submit_attempt'), 1);
assert.equal(funnelCounts.get('rank_submit_success'), 1);
for (const row of reportRows[0]) {
  if (row.from_visit_pct != null) assert.ok(row.from_visit_pct <= 100);
  if (row.from_prior_pct != null) assert.ok(row.from_prior_pct <= 100);
}

const allWindow = reportRows[1].find((row) => row.period === 'all');
assert.equal(allWindow.active_sessions, 3);
assert.equal(allWindow.visits, 2);
assert.equal(allWindow.completed, 1);
assert.equal(allWindow.ranked, 1);
assert.equal(reportRows[2][0].visits, 2);
assert.equal(reportRows[2][0].starts, 1);
assert.equal(reportRows[2][0].percentiles, 1);
assert.equal(reportRows[2][0].rank_successes, 1);
assert.ok(reportRows[3].every((row) => row.session !== 'report_i'));
reportDb.close();

console.log('analytics.test.mjs: PASS');
