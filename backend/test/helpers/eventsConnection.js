// In-memory collection/session double. Never connects to MongoDB or creates a database.
// This exercises the real store's queries and updates, not MongoDB's transaction engine.
const assert = require('node:assert/strict');
function clone(value) {
  if (value instanceof Date) return new Date(value);
  if (value?._bsontype === 'ObjectId') return new value.constructor(value.toHexString());
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
}
const equal = (a, b) => a?._bsontype === 'ObjectId' || b?._bsontype === 'ObjectId' ? String(a) === String(b) : a === b;
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(row, part));
    if (value && Object.hasOwn(value, '$ne')) return !equal(row[key], value.$ne);
    return equal(row[key], value);
  });
}
function createConnection() {
  let data = { events: [], enrollments: [] };
  let queue = Promise.resolve();
  const connection = {
    db: {
      collection(name) {
        assert.ok(Object.hasOwn(data, name));
        return {
          find(filter = {}) {
            let rows = data[name].filter(row => matches(row, filter)).map(clone);
            return {
              sort(spec) {
                const [key, direction] = Object.entries(spec)[0];
                rows.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * direction);
                return this;
              },
              async toArray() { return rows; }
            };
          },
          async findOne(filter) { return clone(data[name].find(row => matches(row, filter)) || null); },
          async countDocuments(filter) { return data[name].filter(row => matches(row, filter)).length; },
          async insertOne(row) { data[name].push(clone(row)); },
          async updateOne(filter, update, options = {}) {
            let row = data[name].find(row => matches(row, filter));
            const inserting = !row;
            if (!row && !options.upsert) return { modifiedCount: 0 };
            if (!row) { row = clone(filter); data[name].push(row); }
            if (inserting) Object.assign(row, clone(update.$setOnInsert || {}));
            Object.assign(row, clone(update.$set || {}));
            for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
            return { modifiedCount: 1 };
          }
        };
      }
    },
    async startSession() {
      const session = {
        async withTransaction(action) {
          const run = queue.then(async () => {
            const before = clone(data);
            try { return await action(); } catch (error) { data = before; throw error; }
          });
          queue = run.catch(() => {});
          return run;
        },
        async endSession() {}
      };
      return session;
    }
  };
  return connection;
}
module.exports = { createConnection };
