const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { createStore } = require('../services/eventStore');
const express = require('express');
const createRoutes = require('../routes/eventRoutes');
const mongoose = require('mongoose');
const { createConnection } = require('./helpers/eventsConnection');
const secret = 'isolated-test-secret';
process.env.JWT_SECRET = secret;
function token(userId = 'alice', exp = Math.floor(Date.now() / 1000) + 300) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
}
function event(overrides = {}) {
  return { _id: 'sample', slug: 'sample-event', title: 'Mindful morning', shortDescription: 'Gentle practice', description: 'A guided session', host: 'Test host', venue: 'Online', category: 'Mindfulness', format: 'Online', pricePaise: 0, capacity: 1, startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString(), joinUrl: 'https://example.com/private-room', ...overrides };
}
async function fixture(t) {
  const connection = createConnection();
  const store = createStore(connection);
  store.putEvent = async value => { const { _id, host, joinUrl, isDemo, format, ...rest } = value; await connection.db.collection('events').updateOne({ _id }, { $set: { ...rest, published: true, host: { name: host }, meetingUrl: joinUrl, sampleContent: Boolean(isDemo), format: format === 'In person' ? 'In-person' : format } }, { upsert: true }); };
  await store.putEvent(event());
  const app = express(); app.use(express.json()); app.use('/api/events', createRoutes({ store }));
  const server = require('node:http').createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', user = 'alice', body, authorization = `Bearer ${token(user)}`, origin } = {}) {
    const response = await fetch(base + path, { method, headers: { Authorization: authorization, 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  return { store, request, connection, app };
}
test('public discovery filters, paginates and hides private join links', async t => {
  const { request } = await fixture(t);
  const list = await request('/api/events?q=mindful&category=Mindfulness&format=Online&limit=1');
  assert.equal(list.data.total, 1); assert.equal(list.data.events[0].joinUrl, undefined);
  assert.equal((await request('/api/events?q=nomatch')).data.total, 0);
  assert.equal((await request('/api/events/sample-event')).data.event.joinUrl, undefined);
  assert.equal((await request('/api/events/missing')).status, 404);
});
test('rejects missing, forged, expired tokens and disallowed origins', async t => {
  const { request } = await fixture(t);
  for (const authorization of ['', `Bearer ${token()}x`, `Bearer ${token('alice', 1)}`]) assert.equal((await request('/api/events/mine', { authorization })).status, 401);
  assert.equal((await request('/api/events', { origin: 'https://untrusted.example' })).status, 403);
});
test('free enrollment is idempotent, isolated, capacity-safe, cancellable and rebookable', async t => {
  const { request } = await fixture(t);
  const options = { method: 'POST', body: {} };
  const results = await Promise.all(['alice', 'bob'].map(user => request('/api/events/sample/enroll', { ...options, user })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const winner = results[0].status === 200 ? 'alice' : 'bob'; const loser = winner === 'alice' ? 'bob' : 'alice';
  const first = await request('/api/events/sample/enroll', { ...options, user: winner });
  const repeated = await request('/api/events/sample/enroll', { ...options, user: winner });
  assert.equal(first.data.enrollment.reference, repeated.data.enrollment.reference);
  assert.equal((await request('/api/events/mine', { user: loser })).data.enrollments.length, 0);
  assert.equal(first.data.enrollment.event.joinUrl, 'https://example.com/private-room');
  assert.equal((await request('/api/events/sample/cancel', { ...options, user: loser })).status, 404);
  const cancelled = await request('/api/events/sample/cancel', { ...options, user: winner });
  assert.equal(cancelled.data.enrollment.status, 'cancelled'); assert.equal(cancelled.data.enrollment.event.joinUrl, undefined);
  assert.equal((await request('/api/events/sample/enroll', { ...options, user: loser })).status, 200);
});
test('completed and in-person events never expose meeting URLs, including to confirmed owners', async t => {
  const { request, store } = await fixture(t);
  await request('/api/events/sample/enroll', { method: 'POST', body: {} });
  await store.putEvent(event({ format: 'In person' }));
  assert.equal((await request('/api/events/mine')).data.enrollments[0].event.joinUrl, undefined);
  await store.putEvent(event({ startsAt: new Date(Date.now() - 7200000).toISOString(), endsAt: new Date(Date.now() - 3600000).toISOString() }));
  assert.equal((await request('/api/events/mine')).data.enrollments[0].event.joinUrl, undefined);
});
test('existing ObjectId bookings are reused and unrelated Atlas fields survive cancellation', async t => {
  const { request, connection } = await fixture(t);
  const eventId = new mongoose.mongo.ObjectId(), userId = new mongoose.mongo.ObjectId(), enrollmentId = new mongoose.mongo.ObjectId();
  const original = { ...event(), _id: eventId, slug: 'existing-event', host: { name: 'Existing host' }, format: 'In-person', published: true, meetingUrl: 'https://example.com/private', agenda: [{ time: '10:00', title: 'Practice', description: 'Guided session' }], enrolledCount: 1, untouched: { keep: true } };
  await connection.db.collection('events').insertOne(original);
  await connection.db.collection('enrollments').insertOne({ _id: enrollmentId, user: userId, event: eventId, reference: 'EXISTING', status: 'confirmed', paymentStatus: 'not_required', createdAt: new Date(), refundNote: 'Keep this note', amountPaise: 0 });
  const before = await connection.db.collection('events').findOne({ _id: eventId });
  const detail = await request('/api/events/existing-event');
  assert.equal(detail.data.event.host, 'Existing host'); assert.equal(detail.data.event.format, 'In person');
  assert.deepEqual(detail.data.event.agenda, ['10:00 ? Practice ? Guided session']);
  assert.equal(detail.data.event.meetingUrl, undefined); assert.equal(detail.data.event.joinUrl, undefined);
  const mine = await request('/api/events/mine', { user: String(userId) });
  assert.equal(mine.data.enrollments[0]._id, String(enrollmentId));
  const repeated = await request('/api/events/' + eventId + '/enroll', { user: String(userId), method: 'POST', body: {} });
  assert.equal(repeated.data.enrollment.reference, 'EXISTING');
  assert.equal(await connection.db.collection('enrollments').countDocuments({ user: userId, event: eventId }), 1);
  assert.deepEqual(await connection.db.collection('events').findOne({ _id: eventId }), before);
  const newStore = createStore(connection);
  assert.equal((await newStore.enrollment(String(userId), String(eventId))).id, String(enrollmentId));
  const cancel = await request('/api/events/' + eventId + '/cancel', { user: String(userId), method: 'POST', body: {} });
  assert.equal(cancel.status, 200);
  const saved = await connection.db.collection('enrollments').findOne({ _id: enrollmentId });
  assert.equal(saved.refundNote, 'Keep this note'); assert.ok(saved.user.equals(userId));
  assert.deepEqual((await connection.db.collection('events').findOne({ _id: eventId })).untouched, { keep: true });
});
test('separate Express routers share transactional capacity checks', async t => {
  const { request, connection } = await fixture(t);
  const app = express(); app.use(express.json()); app.use('/api/events', createRoutes({ store: createStore(connection) }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const results = await Promise.all([
    request('/api/events/sample/enroll', { method: 'POST', body: {}, user: 'alice' }),
    fetch('http://127.0.0.1:' + server.address().port + '/api/events/sample/enroll', { method: 'POST', headers: { Authorization: 'Bearer ' + token('bob'), 'Content-Type': 'application/json' }, body: '{}' })
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(await connection.db.collection('enrollments').countDocuments({ status: 'confirmed' }), 1);
});
test('unpublished events are hidden; trailing-slash mine requires authentication', async t => {
  const { request, connection } = await fixture(t);
  await connection.db.collection('events').updateOne({ _id: 'sample' }, { $set: { published: false } });
  assert.equal((await request('/api/events')).data.total, 0);
  assert.equal((await request('/api/events/sample')).status, 404);
  assert.equal((await request('/api/events/sample/enroll', { method: 'POST', body: {} })).status, 404);
  assert.equal((await request('/api/events/mine/')).status, 200);
  assert.equal((await request('/api/events/mine/', { authorization: '' })).status, 401);
});

test('legacy event amounts are ignored; registration is free and stored fields are preserved', async t => {
  const { request, store, connection } = await fixture(t);
  await store.putEvent(event({ pricePaise: 15000 }));
  const before = await connection.db.collection('events').findOne({ _id: 'sample' });
  const result = await request('/api/events/sample/enroll', { method: 'POST', body: { userId: 'bob', status: 'cancelled' } });
  assert.equal(result.status, 200);
  assert.equal(result.data.enrollment.status, 'confirmed');
  assert.equal(result.data.checkout, undefined);
  assert.equal(result.data.enrollment.event.pricePaise, undefined);
  const saved = await connection.db.collection('enrollments').findOne({ user: 'alice' });
  for (const field of ['paymentStatus', 'gatewayOrderId', 'gatewayPaymentId', 'amountPaise', 'currency', 'paymentGateway', 'holdExpiresAt']) assert.equal(saved[field], undefined);
  assert.equal((await store.mine('bob')).length, 0);
  const after = await connection.db.collection('events').findOne({ _id: 'sample' });
  assert.deepEqual(after, { ...before, enrolledCount: 1, __v: 1 });
  assert.equal((await request('/api/events/sample/verify-payment', { method: 'POST', body: {} })).status, 404);
});

test('legacy pending registration neither holds a seat nor changes during My Events reads', async t => {
  const { request, connection, store } = await fixture(t);
  const original = { _id: 'legacy', user: 'alice', event: 'sample', reference: 'LEGACY', status: 'pending',
    paymentStatus: 'pending', gatewayOrderId: 'old-order', holdExpiresAt: new Date(Date.now() + 600000), createdAt: new Date() };
  await connection.db.collection('enrollments').insertOne(original);
  const mine = await request('/api/events/mine');
  assert.equal(mine.status, 200);
  assert.equal(mine.data.enrollments[0].status, 'pending');
  assert.equal(mine.data.enrollments[0].event.joinUrl, undefined);
  assert.deepEqual(await connection.db.collection('enrollments').findOne({ _id: 'legacy' }), original);
  assert.equal(await store.occupied('sample'), 0);
  const result = await request('/api/events/sample/enroll', { method: 'POST', body: {} });
  assert.equal(result.data.enrollment.status, 'confirmed');
  assert.equal(result.data.enrollment.reference, 'LEGACY');
  const saved = await connection.db.collection('enrollments').findOne({ _id: 'legacy' });
  assert.deepEqual(saved, { ...original, status: 'confirmed', updatedAt: saved.updatedAt, cancelledAt: null });
  assert.equal(await connection.db.collection('enrollments').countDocuments({ user: 'alice' }), 1);
});

test('date filters, pagination and chronological sorting remain available', async t => {
  const { request, store } = await fixture(t);
  const later = new Date(Date.now() + 3 * 86400000).toISOString();
  await store.putEvent(event({ _id: 'later', slug: 'later-event', startsAt: later, endsAt: new Date(Date.parse(later) + 3600000).toISOString() }));
  assert.equal((await request('/api/events?limit=1&page=2')).data.events[0]._id, 'later');
  assert.equal((await request('/api/events?sort=latest&limit=1')).data.events[0]._id, 'later');
  assert.equal((await request(`/api/events?from=${encodeURIComponent(later)}`)).data.total, 1);
  assert.equal((await request(`/api/events?to=${encodeURIComponent(later)}`)).data.total, 1);
  assert.equal((await request('/api/events?from=invalid')).status, 400);
  assert.equal((await request('/api/events?from=2030-01-02&to=2030-01-01')).status, 400);
});

test('started events, zero capacity and invalid capacity cannot be booked', async t => {
  const { request, store } = await fixture(t);
  for (const overrides of [{ startsAt: new Date(0) }, { capacity: 0 }, { capacity: null }, { capacity: -1 }]) {
    await store.putEvent(event(overrides));
    assert.equal((await request('/api/events/sample/enroll', { method: 'POST', body: {} })).status, 409);
    assert.equal((await store.mine('alice')).length, 0);
  }
});

test('same-account simultaneous registrations across routers create one enrollment', async t => {
  const { request, connection, store } = await fixture(t);
  const app = express(); app.use(express.json()); app.use('/api/events', createRoutes({ store: createStore(connection) }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const results = await Promise.all([
    request('/api/events/sample/enroll', { method: 'POST', body: {} }),
    fetch(`http://127.0.0.1:${server.address().port}/api/events/sample/enroll`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: '{}' })
  ]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.equal(await connection.db.collection('enrollments').countDocuments({}), 1);
  assert.equal(await store.occupied('sample'), 1);
});

test('cancellation is idempotent and rebooking reuses the enrollment reference', async t => {
  const { request, connection } = await fixture(t);
  const options = { method: 'POST', body: {} };
  const first = await request('/api/events/sample/enroll', options);
  await request('/api/events/sample/cancel', options);
  const before = await connection.db.collection('enrollments').findOne({ user: 'alice' });
  assert.equal((await request('/api/events/sample/cancel', options)).status, 200);
  assert.deepEqual(await connection.db.collection('enrollments').findOne({ user: 'alice' }), before);
  const again = await request('/api/events/sample/enroll', options);
  assert.equal(again.data.enrollment.reference, first.data.enrollment.reference);
  assert.equal(again.data.enrollment.status, 'confirmed');
  assert.equal(await connection.db.collection('enrollments').countDocuments({}), 1);
});

test('write endpoints require authentication and a token with a user identity', async t => {
  const { request } = await fixture(t);
  for (const action of ['enroll', 'cancel']) {
    assert.equal((await request(`/api/events/sample/${action}`, { method: 'POST', body: {}, authorization: '' })).status, 401);
    assert.equal((await request(`/api/events/sample/${action}`, { method: 'POST', body: {}, authorization: `Bearer ${token(null)}` })).status, 401);
  }
});
