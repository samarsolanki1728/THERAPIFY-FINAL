const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');

// Isolated test values; never read or connect to the deployed database.
process.env.DOTENV_CONFIG_PATH = '__no_test_env_file__';
process.env.CHAT_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.JWT_SECRET = 'serverless-test-only';
process.env.MONGO_URI = 'mongodb://example.invalid/test';
process.env.VERCEL = '1';

test('serverless app exports without startup side effects and gates API requests', async t => {
  let connects = 0;
  let fail = false;
  t.mock.method(mongoose, 'connect', async () => {
    connects++;
    if (fail) throw new Error('private database failure details');
    return mongoose;
  });
  t.mock.method(express.application, 'listen', () => assert.fail('Import must not start a listener'));
  const app = require('../server');
  assert.equal(typeof app, 'function');
  assert.equal(require('..'), app);
  assert.equal(connects, 0);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    assert.equal((await fetch(base)).status, 200);
    assert.equal(connects, 0);

    // Database readiness must precede routes, and auth must remain in place.
    const protectedResponse = await fetch(`${base}/api/journals`);
    assert.equal(protectedResponse.status, 401);
    assert.equal(connects, 1);
    fail = true;
    const unavailable = await fetch(`${base}/api/journals`);
    assert.equal(unavailable.status, 503);
    assert.doesNotMatch(await unavailable.text(), /private|example\.invalid/);
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    fail = false;
    assert.equal((await fetch(`${base}/api/journals`)).status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('database initialization shares in-flight connections, reuses ready connections and retries failures', async t => {
  const connectDB = require('../config/db');
  let calls = 0;
  let resolveConnection;
  t.mock.method(mongoose, 'connect', () => {
    calls++;
    return new Promise(resolve => { resolveConnection = resolve; });
  });
  const first = connectDB();
  const second = connectDB();
  assert.equal(calls, 1);
  resolveConnection(mongoose);
  await Promise.all([first, second]);
  mongoose.connection.readyState = 1;
  try {
    assert.equal(await connectDB(), mongoose);
    assert.equal(calls, 1);
  } finally { mongoose.connection.readyState = 0; }

  t.mock.method(mongoose, 'connect', async () => { throw new Error('test outage'); });
  await assert.rejects(connectDB(), /test outage/);
  t.mock.method(mongoose, 'connect', async () => mongoose);
  assert.equal(await connectDB(), mongoose);
  const uri = process.env.MONGO_URI;
  delete process.env.MONGO_URI;
  try { await assert.rejects(connectDB(), /not configured/); }
  finally { process.env.MONGO_URI = uri; }
});

test('direct local startup waits for MongoDB and starts exactly one listener; Vercel starts none', async t => {
  const { readFileSync } = require('node:fs');
  const { createRequire } = require('node:module');
  const { runInNewContext } = require('node:vm');
  const filename = require.resolve('../server');
  const source = readFileSync(filename, 'utf8');
  const entryModule = { exports: {} };
  const entryRequire = createRequire(filename);
  entryRequire.main = entryModule;
  let ready = false;
  let listeners = 0;
  t.mock.method(mongoose, 'connect', async () => { ready = true; return mongoose; });
  t.mock.method(express.application, 'listen', () => {
    assert.equal(ready, true);
    listeners++;
  });
  const context = { require: entryRequire, module: entryModule, process, console };
  delete process.env.VERCEL;
  try {
    runInNewContext(source, context, { filename });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(listeners, 1);
    process.env.VERCEL = '1';
    ready = false;
    runInNewContext(source, { ...context }, { filename });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ready, false);
    assert.equal(listeners, 1);
  } finally { process.env.VERCEL = '1'; }
});
