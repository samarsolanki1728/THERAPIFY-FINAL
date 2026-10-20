const mongoose = require('mongoose');
const { AsyncLocalStorage } = require('node:async_hooks');
const { ObjectId } = mongoose.mongo;

// Use the existing collections directly: no schema migrations, seeds, or automatic indexes.
function createStore(connection = mongoose.connection) {
  const context = new AsyncLocalStorage();
  const events = () => connection.db.collection('events');
  const enrollments = () => connection.db.collection('enrollments');
  const options = () => context.getStore() ? { session: context.getStore() } : {};
  const id = value => ObjectId.isValid(value) ? new ObjectId(value) : value;
  function eventView(row) {
    if (!row) return null;
    return { _id: String(row._id), published: row.published === true, slug: row.slug, title: row.title,
      shortDescription: row.shortDescription, description: row.description,
      host: typeof row.host === 'object' ? row.host?.name || '' : row.host,
      venue: row.venue, category: row.category, format: row.format === 'In-person' ? 'In person' : row.format,
      startsAt: row.startsAt, endsAt: row.endsAt,
      capacity: row.capacity, agenda: (row.agenda || []).map(item => typeof item === 'string' ? item : [item.time, item.title, item.description].filter(Boolean).join(' ? ')), isDemo: row.sampleContent === true,
      joinUrl: row.meetingUrl || row.joinUrl || '' };
  }
  function enrollmentView(row) {
    if (!row) return null;
    return { id: String(row._id), userId: String(row.user), eventId: String(row.event),
      reference: row.reference, status: row.status, createdAt: row.createdAt || row.enrolledAt };
  }
  const store = {
    async events() { return (await events().find({ published: true }, options()).toArray()).map(eventView); },
    async event(value) { return eventView(await events().findOne({ $or: [{ _id: id(value) }, { slug: value }] }, options())); },
    async mine(userId) { return (await enrollments().find({ user: id(userId) }, options()).sort({ createdAt: -1 }).toArray()).map(enrollmentView); },
    async enrollment(userId, eventId) { return enrollmentView(await enrollments().findOne({ user: id(userId), event: id(eventId) }, options())); },
    async occupied(eventId, exclude) {
      return enrollments().countDocuments({ event: id(eventId), ...(exclude ? { _id: { $ne: id(exclude) } } : {}),
        status: 'confirmed' }, options());
    },
    async save(row) {
      const now = new Date();
      await enrollments().updateOne({ user: id(row.userId), event: id(row.eventId) }, {
        $set: { status: row.status, updatedAt: now,
          cancelledAt: row.status === 'cancelled' ? now : null },
        $setOnInsert: { _id: id(row.id), reference: row.reference, createdAt: new Date(row.createdAt),
          enrolledAt: new Date(row.createdAt) }
      }, { ...options(), upsert: true });
    },
    async transaction(eventId, action) {
      if (context.getStore()) return action();
      const session = await connection.startSession();
      try {
        return await session.withTransaction(() => context.run(session, async () => {
          // A write on the event serializes capacity checks across backend processes.
          await events().updateOne({ _id: id(eventId) }, { $inc: { __v: 1 } }, { session });
          const result = await action();
          const confirmed = await enrollments().countDocuments({ event: id(eventId), status: 'confirmed' }, { session });
          await events().updateOne({ _id: id(eventId) }, { $set: { enrolledCount: confirmed } }, { session });
          return result;
        }));
      } finally { await session.endSession(); }
    }
  };
  return store;
}
module.exports = { createStore };
