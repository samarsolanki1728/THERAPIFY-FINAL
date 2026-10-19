import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const categories = ['Mindfulness', 'Meditation', 'Stress Management', 'Anxiety Support', 'Emotional Wellness', 'Self-Care', 'Yoga', 'Expert Workshops'];
export function validateEvent(event) {
  for (const field of ['_id', 'slug', 'title', 'shortDescription', 'description', 'host', 'venue']) {
    if (typeof event[field] !== 'string' || !event[field].trim() || event[field].length > 6000) throw new Error(`Invalid event ${field}`);
  }
  if (!/^[a-z0-9-]+$/.test(event.slug) || !/^[a-zA-Z0-9_-]+$/.test(event._id)) throw new Error('Invalid event ID or slug');
  if (!categories.includes(event.category) || !['Online', 'In person'].includes(event.format)) throw new Error('Invalid category or format');
  if (!Number.isInteger(event.pricePaise) || event.pricePaise < 0 || event.pricePaise > 10000000) throw new Error('Invalid price in paise');
  if (!Number.isInteger(event.capacity) || event.capacity < 1) throw new Error('Invalid capacity');
  if (!Number.isFinite(Date.parse(event.startsAt)) || !(Date.parse(event.endsAt) > Date.parse(event.startsAt))) throw new Error('Invalid event dates');
  if (event.joinUrl && !/^https:\/\//.test(event.joinUrl)) throw new Error('Join URL must use HTTPS');
  if (event.isDemo && event.pricePaise !== 0) throw new Error('Demo events must be free');
  return event;
}
export function createStore(filename = process.env.EVENTS_DB_PATH || resolve(import.meta.dirname, 'data/events.sqlite')) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, eventId TEXT NOT NULL REFERENCES events(id),
      reference TEXT UNIQUE NOT NULL, status TEXT NOT NULL, paymentStatus TEXT NOT NULL,
      orderId TEXT, paymentId TEXT, holdUntil TEXT, createdAt TEXT NOT NULL, UNIQUE(userId, eventId));`);
  return {
    db,
    events: () => db.prepare('SELECT data FROM events').all().map(row => JSON.parse(row.data)),
    event: id => { const row = db.prepare('SELECT data FROM events WHERE id=? OR slug=?').get(id, id); return row ? JSON.parse(row.data) : null; },
    putEvent(event) {
      validateEvent(event);
      db.prepare('INSERT INTO events(id,slug,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,data=excluded.data').run(event._id, event.slug, JSON.stringify(event));
    },
    mine: userId => db.prepare('SELECT * FROM enrollments WHERE userId=? ORDER BY createdAt DESC').all(userId),
    enrollment: (userId, eventId) => db.prepare('SELECT * FROM enrollments WHERE userId=? AND eventId=?').get(userId, eventId),
    occupied(eventId, exclude = '') {
      return db.prepare("SELECT count(*) AS count FROM enrollments WHERE eventId=? AND id!=? AND (status='confirmed' OR (status='pending' AND holdUntil>?))").get(eventId, exclude, new Date().toISOString()).count;
    },
    save(row) {
      db.prepare(`INSERT INTO enrollments(id,userId,eventId,reference,status,paymentStatus,orderId,paymentId,holdUntil,createdAt)
        VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(userId,eventId) DO UPDATE SET
        status=excluded.status,paymentStatus=excluded.paymentStatus,orderId=excluded.orderId,
        paymentId=excluded.paymentId,holdUntil=excluded.holdUntil`).run(
        row.id, row.userId, row.eventId, row.reference, row.status, row.paymentStatus,
        row.orderId || null, row.paymentId || null, row.holdUntil || null, row.createdAt);
    },
    transaction(action) {
      db.exec('BEGIN IMMEDIATE');
      try { const result = action(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => db.close()
  };
}
