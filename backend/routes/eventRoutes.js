const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { randomUUID } = require('node:crypto');
const { ObjectId } = require('mongoose').mongo;
const { createPayments } = require('../services/eventPayments');

function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function createEventsRoutes({ store = require("../services/eventStore").createStore(), origin = 'http://localhost:5173', payments = createPayments() }) {
  let queue = Promise.resolve();
  const serialize = task => { const next = queue.then(task); queue = next.catch(() => {}); return next; };
  const limits = new Map();
  async function publicEvent(event, canJoin = false) {
    const { joinUrl, published, ...safe } = event;
    return { ...safe, spotsRemaining: Math.max(0, event.capacity - (await store.occupied(event._id))),
      paymentAvailable: event.pricePaise === 0 || payments.enabled,
      ...(canJoin && event.format === 'Online' && new Date(event.endsAt) > new Date() && joinUrl ? { joinUrl } : {}) };
  }
  async function present(row) {
    const { userId, ...safe } = row;
    const event = await store.event(row.eventId);
    return { ...safe, _id: row.id, event: await publicEvent(event, row.status === 'confirmed' && ['paid', 'not_required'].includes(row.paymentStatus)) };
  }
  async function confirmPayment(row, payment) {
    const event = await store.event(row.eventId);
    if (!payment || payment.status !== 'captured') fail(409, 'Payment is not captured yet. Refresh My events shortly to check again.');
    if (payment.order_id !== row.orderId || payment.amount !== event.pricePaise || payment.currency !== 'INR') fail(400, 'Payment details do not match this event.');
    return store.transaction(event._id, async () => {
      const current = await store.enrollment(row.userId, row.eventId);
      if (current.paymentStatus === 'paid' || current.paymentStatus === 'refund_requested') return current;
      const available = current.status !== 'cancelled' && new Date(event.startsAt) > new Date() && (await store.occupied(event._id, row.id)) < event.capacity;
      const next = { ...current, paymentId: payment.id, status: available ? 'confirmed' : 'cancelled', paymentStatus: available ? 'paid' : 'refund_requested', holdUntil: null };
      await store.save(next); return next;
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
      const price = url.searchParams.get('price');
      const from = url.searchParams.get('from'); const to = url.searchParams.get('to');
      if ((from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to))) || (from && to && Date.parse(from) > Date.parse(to))) fail(400, 'Please choose a valid date range.');
      if (price && !['free', 'paid'].includes(price)) fail(400, 'Invalid price filter.');
      const events = (await store.events()).filter(event => new Date(event.endsAt) > new Date() &&
        (!from || Date.parse(event.startsAt) >= Date.parse(from)) && (!to || Date.parse(event.startsAt) < Date.parse(to)) &&
        (!price || (price === 'free' ? event.pricePaise === 0 : event.pricePaise > 0)) &&
        (!category || event.category === category) && (!format || event.format === format) &&
        `${event.title} ${event.shortDescription} ${event.host}`.toLowerCase().includes(q));
      events.sort((a, b) => sort === 'price-low' ? a.pricePaise - b.pricePaise || Date.parse(a.startsAt) - Date.parse(b.startsAt) : sort === 'price-high' ? b.pricePaise - a.pricePaise || Date.parse(a.startsAt) - Date.parse(b.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
      return { events: await Promise.all(events.slice((page - 1) * limit, page * limit).map(event => publicEvent(event))), total: events.length, page, pages: Math.ceil(events.length / limit) };
    }
    if (req.method === 'GET' && path === '/api/events/mine') {
      const userId = req.user.userId;
      return serialize(async () => {
        let paymentCheckPending = false;
        for (const row of await store.mine(userId)) {
          try { await reconcile(row); } catch { paymentCheckPending = true; }
        }
        return { enrollments: await Promise.all((await store.mine(userId)).map(present)), paymentCheckPending };
      });
    }
    const match = path.match(/^\/api\/events\/([^/]+)(?:\/(enroll|cancel|verify-payment))?$/);
    if (!match) fail(404, 'Endpoint not found.');
    const event = await store.event(decodeURIComponent(match[1]));
    if (!event || !event.published) fail(404, 'Event not found.');
    if (req.method === 'GET' && !match[2]) return { event: await publicEvent(event) };
    if (req.method !== 'POST' || !match[2]) fail(405, 'Method not allowed.');
    const userId = req.user.userId;
    const now = Date.now();
    for (const [key, item] of limits) if (item.until < now) limits.delete(key);
    const limit = limits.get(userId) || { count: 0, until: now + 60000 };
    limits.set(userId, limit);
    if (++limit.count > 30) fail(429, 'Too many requests. Please wait a minute.');
    const input = req.body || {};
    if (typeof input !== 'object' || Array.isArray(input)) fail(400, 'Please send a JSON object.');
    return serialize(async () => {
      let existing = await store.enrollment(userId, event._id);
      if (match[2] === 'verify-payment') {
        if (!existing?.orderId) fail(404, 'No checkout found for this account and event.');
        const payment = await payments.verify(existing, input);
        return { enrollment: await present(await confirmPayment(existing, payment)) };
      }
      if (existing?.orderId && existing.paymentStatus === 'pending') existing = await reconcile(existing);
      if (match[2] === 'cancel') {
        if (!existing) fail(404, 'Enrollment not found.');
        if (existing.status === 'cancelled') return { enrollment: await present(existing) };
        if (new Date(event.startsAt) <= new Date()) fail(409, 'This event has already started.');
        let cancelled = { ...existing, status: 'cancelled', holdUntil: null, paymentStatus: existing.paymentStatus === 'paid' ? 'refund_requested' : existing.paymentStatus };
        await store.transaction(event._id, async () => {
          const current = await store.enrollment(userId, event._id);
          cancelled = { ...current, status: "cancelled", holdUntil: null, paymentStatus: current.paymentStatus === "paid" ? "refund_requested" : current.paymentStatus };
          await store.save(cancelled);
        });
        return { enrollment: await present(cancelled), message: cancelled.paymentStatus === 'refund_requested' ? 'Cancellation saved. A refund has been requested; it has not been issued yet. Contact the organizer to follow up.' : 'Your enrollment has been cancelled.' };
      }
      if (existing?.status === 'confirmed') return { enrollment: await present(existing) };
      if (existing?.paymentStatus === 'refund_requested') fail(409, 'A refund request is pending for this event. Please contact the organizer.');
      if (new Date(event.startsAt) <= new Date()) fail(409, 'Enrollment has closed for this event.');
      if (event.pricePaise > 0 && !payments.enabled) fail(503, 'Paid enrollment is not available yet. Please choose a free event.');
      let row = await store.transaction(event._id, async () => {
        existing = await store.enrollment(userId, event._id);
        if (existing?.status === "confirmed") return existing;
        if (existing?.paymentStatus === "refund_requested") fail(409, "A refund request is pending for this event.");
        if ((await store.occupied(event._id, existing?.id)) >= event.capacity) fail(409, 'This event is fully booked.');
        const next = { id: existing?.id || new ObjectId().toHexString(), userId, eventId: event._id,
          reference: existing?.reference || `TH-${randomUUID().slice(0, 18)}`, createdAt: existing?.createdAt || new Date().toISOString(),
          status: event.pricePaise ? 'pending' : 'confirmed', paymentStatus: event.pricePaise ? 'pending' : 'not_required',
          orderId: existing?.orderId || null, holdUntil: event.pricePaise ? new Date(Date.now() + 15 * 60000).toISOString() : null };
        await store.save(next); return next;
      });
      if (!event.pricePaise || row.status === 'confirmed') return { enrollment: await present(row) };
      let ownsOrderRequest = false;
      try {
        if (!row.orderId) {
          ownsOrderRequest = await store.claimOrder(row);
          if (!ownsOrderRequest) fail(409, 'Checkout is already being prepared. Refresh My events shortly.');
          const order = await payments.createOrder(event, row.reference);
          row = await store.transaction(event._id, async () => {
            const current = await store.enrollment(userId, event._id);
            const next = { ...current, orderId: order.id };
            await store.save(next); await store.releaseOrder(next); return next;
          });
        }
        if (row.status !== 'pending') return { enrollment: await present(row) };
        return { enrollment: await present(row), checkout: { keyId: payments.keyId, orderId: row.orderId, amount: event.pricePaise, currency: 'INR' } };
      } catch (error) {
        if (ownsOrderRequest && !row.orderId) await store.transaction(event._id, async () => {
          const current = await store.enrollment(userId, event._id);
          if (!current.orderId) await store.save({ ...current, status: 'cancelled', paymentStatus: 'failed', holdUntil: null });
          await store.releaseOrder(current);
        });
        throw error;
      }
    });
  }

  const router = express.Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.headers.origin && req.headers.origin !== origin) return res.status(403).json({ message: 'Origin not allowed.' });
    if (req.method !== 'GET' || req.path.replace(/\/$/, '') === '/mine') return requireAuth(req, res, next);
    next();
  });
  router.use(async (req, res) => {
    try { res.json(await route({ method: req.method, url: '/api/events' + (req.url === '/' ? '' : req.url), headers: req.headers, user: req.user, body: req.body })); }
    catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Events service could not complete this request. Please retry.' }); }
  });
  return router;
}
module.exports = createEventsRoutes;
