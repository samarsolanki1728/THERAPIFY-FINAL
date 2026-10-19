import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { authenticate } from './auth.js';
import { createPayments } from './payments.js';

function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
async function readBody(req) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) fail(413, 'Request is too large.'); }
  try { const value = JSON.parse(body || '{}'); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
  catch { fail(400, 'Please send a JSON object.'); }
}

export function createApp({ store, secret, origin = 'http://localhost:5173', payments = createPayments() }) {
  if (!secret) throw new Error('JWT_SECRET is required and must match the existing authentication service.');
  let queue = Promise.resolve();
  const serialize = task => { const next = queue.then(task); queue = next.catch(() => {}); return next; };
  const limits = new Map();
  function publicEvent(event, canJoin = false) {
    const { joinUrl, ...safe } = event;
    return { ...safe, spotsRemaining: Math.max(0, event.capacity - store.occupied(event._id)),
      paymentAvailable: event.pricePaise === 0 || payments.enabled,
      ...(canJoin && joinUrl ? { joinUrl } : {}) };
  }
  function present(row) {
    const { userId, ...safe } = row;
    const event = store.event(row.eventId);
    return { ...safe, _id: row.id, event: publicEvent(event, row.status === 'confirmed' && ['paid', 'not_required'].includes(row.paymentStatus)) };
  }
  function confirmPayment(row, payment) {
    const event = store.event(row.eventId);
    if (!payment || payment.status !== 'captured') fail(409, 'Payment is not captured yet. Refresh My events shortly to check again.');
    if (payment.order_id !== row.orderId || payment.amount !== event.pricePaise || payment.currency !== 'INR') fail(400, 'Payment details do not match this event.');
    return store.transaction(() => {
      const current = store.enrollment(row.userId, row.eventId);
      if (current.paymentStatus === 'paid' || current.paymentStatus === 'refund_requested') return current;
      const available = new Date(event.startsAt) > new Date() && store.occupied(event._id, row.id) < event.capacity;
      const next = { ...current, paymentId: payment.id, status: available ? 'confirmed' : 'cancelled', paymentStatus: available ? 'paid' : 'refund_requested', holdUntil: null };
      store.save(next); return next;
    });
  }
  async function reconcile(row) {
    if (row.orderId && row.paymentStatus === 'pending' && payments.enabled) {
      const payment = await payments.capturedPayment(row.orderId);
      if (payment) return confirmPayment(row, payment);
    }
    return row;
  }

  async function route(req) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/\/$/, '') || '/';
    if (req.method === 'GET' && path === '/') return { message: 'Therapify events service is running' };
    if (req.method === 'GET' && path === '/api/events') {
      const q = (url.searchParams.get('q') || '').slice(0, 200).toLowerCase();
      const category = url.searchParams.get('category'); const format = url.searchParams.get('format');
      const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page'), 10) || 1));
      const limit = Math.max(1, Math.min(50, Number.parseInt(url.searchParams.get('limit'), 10) || 12));
      const sort = url.searchParams.get('sort');
      const events = store.events().filter(event => new Date(event.endsAt) > new Date() &&
        (!category || event.category === category) && (!format || event.format === format) &&
        `${event.title} ${event.shortDescription} ${event.host}`.toLowerCase().includes(q));
      events.sort((a, b) => sort === 'price-low' ? a.pricePaise - b.pricePaise || Date.parse(a.startsAt) - Date.parse(b.startsAt) : sort === 'price-high' ? b.pricePaise - a.pricePaise || Date.parse(a.startsAt) - Date.parse(b.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
      return { events: events.slice((page - 1) * limit, page * limit).map(event => publicEvent(event)), total: events.length, page, pages: Math.ceil(events.length / limit) };
    }
    if (req.method === 'GET' && path === '/api/events/mine') {
      const userId = authenticate(req.headers.authorization, secret);
      return serialize(async () => {
        let paymentCheckPending = false;
        for (const row of store.mine(userId)) {
          try { await reconcile(row); } catch { paymentCheckPending = true; }
        }
        return { enrollments: store.mine(userId).map(present), paymentCheckPending };
      });
    }
    const match = path.match(/^\/api\/events\/([^/]+)(?:\/(enroll|cancel|verify-payment))?$/);
    if (!match) fail(404, 'Endpoint not found.');
    const event = store.event(decodeURIComponent(match[1]));
    if (!event) fail(404, 'Event not found.');
    if (req.method === 'GET' && !match[2]) return { event: publicEvent(event) };
    if (req.method !== 'POST' || !match[2]) fail(405, 'Method not allowed.');
    const userId = authenticate(req.headers.authorization, secret);
    const now = Date.now();
    for (const [key, item] of limits) if (item.until < now) limits.delete(key);
    const limit = limits.get(userId) || { count: 0, until: now + 60000 };
    limits.set(userId, limit);
    if (++limit.count > 30) fail(429, 'Too many requests. Please wait a minute.');
    const input = await readBody(req);
    return serialize(async () => {
      let existing = store.enrollment(userId, event._id);
      if (match[2] === 'verify-payment') {
        if (!existing?.orderId) fail(404, 'No checkout found for this account and event.');
        const payment = await payments.verify(existing, input);
        return { enrollment: present(confirmPayment(existing, payment)) };
      }
      if (existing?.orderId && existing.paymentStatus === 'pending') existing = await reconcile(existing);
      if (match[2] === 'cancel') {
        if (!existing) fail(404, 'Enrollment not found.');
        if (existing.status === 'cancelled') return { enrollment: present(existing) };
        if (existing.paymentStatus === 'pending') fail(409, 'Refresh payment status before cancelling.');
        if (new Date(event.startsAt) <= new Date()) fail(409, 'This event has already started.');
        const cancelled = { ...existing, status: 'cancelled', holdUntil: null, paymentStatus: existing.paymentStatus === 'paid' ? 'refund_requested' : existing.paymentStatus };
        store.save(cancelled);
        return { enrollment: present(cancelled), message: cancelled.paymentStatus === 'refund_requested' ? 'Cancellation saved. A refund has been requested; it has not been issued yet. Contact the organizer to follow up.' : 'Your enrollment has been cancelled.' };
      }
      if (existing?.status === 'confirmed') return { enrollment: present(existing) };
      if (existing?.paymentStatus === 'refund_requested') fail(409, 'A refund request is pending for this event. Please contact the organizer.');
      if (new Date(event.startsAt) <= new Date()) fail(409, 'Enrollment has closed for this event.');
      if (event.pricePaise > 0 && !payments.enabled) fail(503, 'Paid enrollment is not available yet. Please choose a free event.');
      const row = store.transaction(() => {
        if (store.occupied(event._id, existing?.id) >= event.capacity) fail(409, 'This event is fully booked.');
        const next = { id: existing?.id || randomUUID(), userId, eventId: event._id,
          reference: existing?.reference || `TH-${randomUUID().slice(0, 18)}`, createdAt: existing?.createdAt || new Date().toISOString(),
          status: event.pricePaise ? 'pending' : 'confirmed', paymentStatus: event.pricePaise ? 'pending' : 'not_required',
          orderId: existing?.orderId || null, holdUntil: event.pricePaise ? new Date(Date.now() + 15 * 60000).toISOString() : null };
        store.save(next); return next;
      });
      if (!event.pricePaise) return { enrollment: present(row) };
      try {
        if (!row.orderId) { const order = await payments.createOrder(event, row.reference); row.orderId = order.id; store.save(row); }
        return { enrollment: present(row), checkout: { keyId: payments.keyId, orderId: row.orderId, amount: event.pricePaise, currency: 'INR' } };
      } catch (error) {
        if (!row.orderId) store.save({ ...row, status: 'cancelled', paymentStatus: 'failed', holdUntil: null });
        throw error;
      }
    });
  }

  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    if (req.headers.origin && req.headers.origin !== origin) { res.writeHead(403); res.end(JSON.stringify({ message: 'Origin not allowed.' })); return; }
    if (req.headers.origin === origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    try { const data = await route(req); res.writeHead(200); res.end(JSON.stringify(data)); }
    catch (error) { res.writeHead(error.status || 500); res.end(JSON.stringify({ message: error.status ? error.message : 'Events service could not complete this request. Please retry.' })); }
  });
}
