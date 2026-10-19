import { readFileSync } from 'node:fs';
import { createStore, validateEvent } from './store.js';
if (!process.argv[2]) throw new Error('Usage: npm run import:catalog -- path/to/events.json');
const events = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(events)) throw new Error('Catalog must be an array.');
events.forEach(validateEvent);
const store = createStore();
store.transaction(() => {
  for (const event of events) {
    if (store.db.prepare('SELECT 1 FROM enrollments WHERE eventId=? LIMIT 1').get(event._id)) throw new Error(`Cannot replace event ${event._id} after enrollment; create a new event instead.`);
    store.putEvent(event);
  }
});
store.close(); console.log(`Imported ${events.length} events.`);
