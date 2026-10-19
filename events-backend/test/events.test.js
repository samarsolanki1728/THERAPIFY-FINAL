import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../store.js';
import { createApp } from '../app.js';
import { createPayments } from '../payments.js';
const secret = 'isolated-test-secret';
function token(userId = 'alice', exp = Math.floor(Date.now() / 1000) + 300) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
}
function event(overrides = {}) {
  return { _id: 'sample', slug: 'sample-event', title: 'Mindful morning', shortDescription: 'Gentle practice', description: 'A guided session', host: 'Test host', venue: 'Online', category: 'Mindfulness', format: 'Online', pricePaise: 0, capacity: 1, startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString(), joinUrl: 'https://example.com/private-room', ...overrides };
}
async function fixture(t, payments = { enabled: false }) {
  const store = createStore(':memory:'); store.putEvent(event());
  const server = createApp({ store, secret, payments });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', user = 'alice', body, authorization = `Bearer ${token(user)}`, origin } = {}) {
    const response = await fetch(base + path, { method, headers: { Authorization: authorization, 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  return { store, request };
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
test('paid checkout fails clearly when unconfigured; past events cannot enroll', async t => {
  const { request, store } = await fixture(t);
  store.putEvent(event({ pricePaise: 10000 }));
  assert.equal((await request('/api/events/sample/enroll', { method: 'POST', body: {} })).status, 503);
  assert.equal(store.mine('alice').length, 0);
  store.putEvent(event({ startsAt: new Date(Date.now() - 60000).toISOString() }));
  assert.equal((await request('/api/events/sample/enroll', { method: 'POST', body: {} })).status, 409);
});
test('paid enrollment verifies capture and amount and supports reconciliation and refund requests', async t => {
  let payment = null;
  const payments = { enabled: true, keyId: 'test_key', createOrder: async () => ({ id: 'order_test' }), capturedPayment: async () => payment, verify: async () => payment };
  const { request, store } = await fixture(t, payments); store.putEvent(event({ pricePaise: 15000 }));
  const options = { method: 'POST', body: {} };
  const pending = await request('/api/events/sample/enroll', options);
  assert.equal(pending.data.enrollment.status, 'pending'); assert.equal(pending.data.checkout.amount, 15000);
  assert.equal(pending.data.enrollment.event.joinUrl, undefined);
  payment = { id: 'pay_test', order_id: 'order_test', amount: 1, currency: 'INR', status: 'captured' };
  assert.equal((await request('/api/events/sample/verify-payment', options)).status, 400);
  payment.amount = 15000; payment.status = 'authorized';
  assert.equal((await request('/api/events/sample/verify-payment', options)).status, 409);
  payment.status = 'captured';
  const mine = await request('/api/events/mine'); assert.equal(mine.data.enrollments[0].paymentStatus, 'paid');
  const cancel = await request('/api/events/sample/cancel', options); assert.equal(cancel.data.enrollment.paymentStatus, 'refund_requested');
  assert.equal((await request('/api/events/sample/enroll', options)).status, 409);
});
test('late captured payment cannot overbook an expired reservation', async t => {
  const payments = { enabled: true, keyId: 'key', createOrder: async () => ({ id: 'order_late' }), capturedPayment: async () => null, verify: async () => ({ id: 'pay_late', order_id: 'order_late', amount: 100, currency: 'INR', status: 'captured' }) };
  const { request, store } = await fixture(t, payments); store.putEvent(event({ pricePaise: 100 }));
  await request('/api/events/sample/enroll', { method: 'POST', body: {} });
  const row = store.enrollment('alice', 'sample'); store.save({ ...row, holdUntil: new Date(0).toISOString() });
  store.save({ ...row, id: 'other', userId: 'bob', reference: 'other-ref', status: 'confirmed', paymentStatus: 'paid' });
  const result = await request('/api/events/sample/verify-payment', { method: 'POST', body: {} });
  assert.equal(result.data.enrollment.paymentStatus, 'refund_requested'); assert.equal(store.occupied('sample'), 1);
});
test('Razorpay adapter rejects mismatched order and invalid signature before a network call', async () => {
  const payments = createPayments({ keyId: 'key', keySecret: 'secret' });
  await assert.rejects(payments.verify({ orderId: 'order_saved' }, { razorpay_order_id: 'order_wrong', razorpay_payment_id: 'pay_1' }), /does not match/);
  await assert.rejects(payments.verify({ orderId: 'order_saved' }, { razorpay_order_id: 'order_saved', razorpay_payment_id: 'pay_1', razorpay_signature: 'forged' }), /signature/);
});
test('event and enrollment persistence survives a service restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'therapify-events-test-'));
  const file = join(directory, 'events.sqlite');
  try { let store = createStore(file); store.putEvent(event()); store.save({ id: 'one', userId: 'alice', eventId: 'sample', reference: 'REF', status: 'confirmed', paymentStatus: 'not_required', createdAt: new Date().toISOString() }); store.close(); store = createStore(file); assert.equal(store.mine('alice').length, 1); assert.equal(store.event('sample').title, 'Mindful morning'); store.close(); }
  finally { rmSync(directory, { recursive: true, force: true }); }
});
