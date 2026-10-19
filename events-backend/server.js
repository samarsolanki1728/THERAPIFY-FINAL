import { createStore } from './store.js';
import { createApp } from './app.js';
const store = createStore();
const server = createApp({ store, secret: process.env.JWT_SECRET, origin: process.env.EVENTS_ALLOWED_ORIGIN || 'http://localhost:5173' });
const port = Number(process.env.EVENTS_PORT || 5002);
server.listen(port, process.env.EVENTS_HOST || '127.0.0.1', () => console.log(`Events service: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
