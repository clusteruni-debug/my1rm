import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');
const endpointPath = path.join(projectRoot, 'functions', 'api', 'rank.js');
const endpointSource = await readFile(endpointPath, 'utf8');
const endpointModule = await import(`data:text/javascript;base64,${Buffer.from(endpointSource).toString('base64')}`);
const { onRequestPost } = endpointModule;

function d1Adapter(database) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...nextValues) {
          values = nextValues;
          return this;
        },
        async first() {
          return database.prepare(sql).get(...values) || null;
        },
        async run() {
          const result = database.prepare(sql).run(...values);
          return {
            success: true,
            meta: { last_row_id: Number(result.lastInsertRowid || 0) },
          };
        },
      };
    },
  };
}

function rankRequest(body, headers = {}, cf = { country: 'KR', city: 'Seoul' }) {
  const request = new Request('https://my1rm.test/api/rank', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  Object.defineProperty(request, 'cf', { value: cf });
  return request;
}

function validPayload(overrides = {}) {
  return {
    session_id: 'session_rank_12345678901234567890',
    total_kg: 450,
    squat_kg: 150,
    bench_kg: 100,
    deadlift_kg: 200,
    sex: 'male',
    age_bucket: '24-34',
    is_internal: false,
    ...overrides,
  };
}

const schema = await readFile(path.join(projectRoot, 'schema.sql'), 'utf8');
const database = new DatabaseSync(':memory:');
database.exec(schema);
const DB = d1Adapter(database);

{
  const response = await onRequestPost({ request: rankRequest(validPayload()), env: { DB } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.cohortTotal, 1);
  assert.equal(body.percentile, null);
  assert.equal(body.stored, true);
  assert.deepEqual(Object.keys(body).sort(), ['cohortTotal', 'ok', 'percentile', 'stored']);
  assert.equal(database.prepare('SELECT COUNT(*) AS c FROM records').get().c, 1);
}

{
  const response = await onRequestPost({
    request: rankRequest(validPayload({
      total_kg: 475,
      squat_kg: 160,
      bench_kg: 105,
      deadlift_kg: 210,
    })),
    env: { DB },
  });
  assert.equal(response.status, 200);
  assert.equal(database.prepare('SELECT COUNT(*) AS c FROM records').get().c, 1, 'same tab session must replace its row');
  assert.equal(database.prepare('SELECT total_kg FROM records').get().total_kg, 475);
}

{
  const response = await onRequestPost({
    request: rankRequest(validPayload({
      session_id: 'session_rank_09876543210987654321',
      total_kg: 430,
      squat_kg: 145,
      bench_kg: 95,
      deadlift_kg: 190,
    })),
    env: { DB },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.cohortTotal, 2);
  assert.equal(database.prepare('SELECT COUNT(*) AS c FROM records').get().c, 2);
}

{
  let prepareCalls = 0;
  const noQueryDB = {
    prepare() {
      prepareCalls += 1;
      throw new Error('internal ranking must not query D1');
    },
  };
  const response = await onRequestPost({
    request: rankRequest(validPayload({
      total_kg: 500,
      squat_kg: 170,
      bench_kg: 110,
      deadlift_kg: 220,
      is_internal: true,
    })),
    env: { DB: noQueryDB },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.stored, false);
  assert.equal(body.percentile, null);
  assert.equal(body.cohortTotal, 0);
  assert.equal(prepareCalls, 0, 'internal rank must not query standings or write D1');
  assert.equal(database.prepare('SELECT COUNT(*) AS c FROM records').get().c, 2, 'internal rank must not add a row');
  assert.equal(
    database.prepare('SELECT total_kg FROM records WHERE session_id = ?').get('session_rank_12345678901234567890').total_kg,
    475,
    'internal rank must not overwrite an earlier external row from the same tab',
  );
}

{
  let prepareCalls = 0;
  const noQueryDB = {
    prepare() {
      prepareCalls += 1;
      throw new Error('internal ranking must not query D1');
    },
  };
  const response = await onRequestPost({
    request: rankRequest(validPayload({
      session_id: 'session_rank_max_123456789012345678',
      total_kg: 6000,
      squat_kg: 2000,
      bench_kg: 2000,
      deadlift_kg: 2000,
      is_internal: true,
    })),
    env: { DB: noQueryDB },
  });
  assert.equal(response.status, 200, 'sum of three valid lift maxima must be accepted');
  assert.equal((await response.json()).stored, false);
  assert.equal(prepareCalls, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS c FROM records').get().c, 2);
}

for (const invalidPayload of [
  validPayload({ session_id: 'short' }),
  validPayload({ sex: 'unknown' }),
  validPayload({ age_bucket: 'unknown' }),
  validPayload({ total_kg: 999 }),
  validPayload({ squat_kg: 0 }),
  validPayload({ is_internal: 'false' }),
  validPayload({ total_kg: 6000.01, squat_kg: 2000.01, bench_kg: 2000, deadlift_kg: 2000 }),
  { ...validPayload(), extra: true },
]) {
  const response = await onRequestPost({ request: rankRequest(invalidPayload), env: { DB } });
  assert.equal(response.status, 400);
}

{
  const response = await onRequestPost({
    request: rankRequest(validPayload(), { 'content-type': 'text/plain' }),
    env: { DB },
  });
  assert.equal(response.status, 415);
}

{
  const response = await onRequestPost({
    request: rankRequest(validPayload(), { origin: 'https://attacker.test' }),
    env: { DB },
  });
  assert.equal(response.status, 403);
}

{
  const response = await onRequestPost({ request: rankRequest('{'), env: { DB } });
  assert.equal(response.status, 400);
}

{
  const response = await onRequestPost({
    request: {
      headers: new Headers({ 'content-type': 'application/json' }),
      url: 'https://my1rm.test/api/rank',
      async text() {
        throw new Error('truncated body');
      },
    },
    env: { DB },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid body' });
}

{
  const response = await onRequestPost({
    request: rankRequest(`{"pad":"${'x'.repeat(1100)}"}`),
    env: { DB },
  });
  assert.equal(response.status, 413);
}

{
  const response = await onRequestPost({ request: rankRequest(validPayload()), env: {} });
  assert.equal(response.status, 500);
}

assert.match(endpointSource, /INSERT OR REPLACE INTO records/);
assert.match(endpointSource, /session_id IS NULL OR session_id <> \?/);
assert.match(endpointSource, /if \(body\.is_internal\) \{[\s\S]*?cohortTotal: 0/);
assert.ok(
  endpointSource.indexOf('if (body.is_internal)') < endpointSource.indexOf('SELECT COUNT(*) AS c FROM records'),
  'internal return must precede every standings query',
);

const migration = await readFile(path.join(projectRoot, 'migrations', '0002_rank_session_id.sql'), 'utf8');
const legacy = new DatabaseSync(':memory:');
legacy.exec(`
  CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    squat_kg REAL NOT NULL DEFAULT 0,
    bench_kg REAL NOT NULL DEFAULT 0,
    deadlift_kg REAL NOT NULL DEFAULT 0,
    total_kg REAL NOT NULL,
    sex TEXT NOT NULL,
    age_bucket TEXT NOT NULL,
    country TEXT,
    city TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO records (total_kg, sex, age_bucket) VALUES (300, 'male', '24-34');
`);
legacy.exec(migration);
assert.ok(legacy.prepare('PRAGMA table_info(records)').all().some((column) => column.name === 'session_id'));
const upsert = legacy.prepare(`
  INSERT OR REPLACE INTO records
    (session_id, squat_kg, bench_kg, deadlift_kg, total_kg, sex, age_bucket)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
upsert.run('session_migration_1234567890123456', 100, 80, 140, 320, 'male', '24-34');
upsert.run('session_migration_1234567890123456', 110, 85, 145, 340, 'male', '24-34');
assert.equal(legacy.prepare('SELECT COUNT(*) AS c FROM records').get().c, 2, 'legacy null row plus one session row');
assert.equal(
  legacy.prepare('SELECT total_kg FROM records WHERE session_id IS NOT NULL').get().total_kg,
  340,
);

database.close();
legacy.close();
console.log('rank.test.mjs: PASS');
