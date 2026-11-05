const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { randomUUID } = require('node:crypto');
const { ObjectId } = require('mongoose').mongo;

function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function createEventsRoutes({ store = require("../services/eventStore").createStore(), origin = 'http://localhost:5173', isAllowedOrigin = value => !value || value === origin }) {
  let queue = Promise.resolve();
  const serialize = task => { const next = queue.then(task); queue = next.catch(() => {}); return next; };
  const limits = new Map();
  async function publicEvent(event, canJoin = false) {
    if (!event) return null;
    const { joinUrl, published, ...safe } = event;
    return { ...safe, spotsRemaining: Math.max(0, event.capacity - (await store.occupied(event._id))),
      ...(canJoin && event.format === 'Online' && new Date(event.endsAt) > new Date() && joinUrl ? { joinUrl } : {}) };
  }
  async function present(row) {
    const { userId, ...safe } = row;
    const event = await store.event(row.eventId);
    return { ...safe, _id: row.id, event: await publicEvent(event, row.status === 'confirmed') };
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
      const from = url.searchParams.get('from'); const to = url.searchParams.get('to');
      if ((from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to))) || (from && to && Date.parse(from) > Date.parse(to))) fail(400, 'Please choose a valid date range.');
      const events = (await store.events()).filter(event => new Date(event.endsAt) > new Date() &&
        (!from || Date.parse(event.startsAt) >= Date.parse(from)) && (!to || Date.parse(event.startsAt) < Date.parse(to)) &&
        (!category || event.category === category) && (!format || event.format === format) &&
        `${event.title} ${event.shortDescription} ${event.host}`.toLowerCase().includes(q));
      events.sort((a, b) => (sort === 'latest' ? -1 : 1) * (Date.parse(a.startsAt) - Date.parse(b.startsAt)));
      return { events: await Promise.all(events.slice((page - 1) * limit, page * limit).map(event => publicEvent(event))), total: events.length, page, pages: Math.ceil(events.length / limit) };
    }
    if (req.method === 'GET' && path === '/api/events/mine') {
      const userId = req.user.userId;
      return { enrollments: await Promise.all((await store.mine(userId)).map(present)) };
    }
    const match = path.match(/^\/api\/events\/([^/]+)(?:\/(enroll|cancel))?$/);
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
      const existing = await store.enrollment(userId, event._id);
      // Repeated registrations are read-only; all state changes recheck inside the transaction.
      if (match[2] === 'enroll' && existing?.status === 'confirmed') return { enrollment: await present(existing) };
      if (match[2] === 'cancel' && existing?.status === 'cancelled') return { enrollment: await present(existing) };
      const row = await store.transaction(event._id, async () => {
        const currentEvent = await store.event(event._id);
        if (!currentEvent?.published) fail(404, 'Event not found.');
        const current = await store.enrollment(userId, event._id);
        if (match[2] === 'cancel') {
          if (!current) fail(404, 'Enrollment not found.');
          if (current.status === 'cancelled') return current;
          if (!(Date.parse(currentEvent.startsAt) > Date.now())) fail(409, 'This event has already started.');
          const cancelled = { ...current, status: 'cancelled' };
          await store.save(cancelled);
          return cancelled;
        }
        if (current?.status === 'confirmed') return current;
        if (!(Date.parse(currentEvent.startsAt) > Date.now())) fail(409, 'Enrollment has closed for this event.');
        if (!Number.isInteger(currentEvent.capacity) || currentEvent.capacity < 0 ||
            (await store.occupied(event._id, current?.id)) >= currentEvent.capacity) fail(409, 'This event is fully booked.');
        const next = { id: current?.id || new ObjectId().toHexString(), userId, eventId: event._id,
          reference: current?.reference || `TH-${randomUUID().slice(0, 18)}`, createdAt: current?.createdAt || new Date().toISOString(),
          status: 'confirmed' };
        await store.save(next);
        return next;
      });
      return { enrollment: await present(row), ...(match[2] === 'cancel' ? { message: 'Your enrollment has been cancelled.' } : {}) };
    });
  }

  const router = express.Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!isAllowedOrigin(req.headers.origin)) return res.status(403).json({ message: 'Origin not allowed.' });
    if (req.method !== 'GET' || req.path.replace(/\/$/, '') === '/mine') return requireAuth(req, res, () => {
      if (typeof req.user?.userId !== 'string' || !req.user.userId.trim()) return res.status(401).json({ message: 'Authentication required.' });
      next();
    });
    next();
  });
  router.use(async (req, res) => {
    try { res.json(await route({ method: req.method, url: '/api/events' + (req.url === '/' ? '' : req.url), headers: req.headers, user: req.user, body: req.body })); }
    catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Events service could not complete this request. Please retry.' }); }
  });
  return router;
}
module.exports = createEventsRoutes;
