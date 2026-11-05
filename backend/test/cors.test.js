const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');

process.env.FRONTEND_URL = 'https://frontend.example/';
const { corsOptions, isAllowedOrigin } = require('../config/cors');

test('CORS permits only configured production and local origins, including credentialed preflights', async () => {
  const app = express();
  app.use(cors(corsOptions));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/events', require('../routes/eventRoutes')({ isAllowedOrigin, store: { events: async () => [] } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const origin of ['https://frontend.example', 'http://localhost:5173']) {
      const response = await fetch(`${base}/api/chat`, { method: 'OPTIONS', headers: {
        Origin: origin, 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type'
      } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
      assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
      assert.equal((await fetch(`${base}/api/events`, { headers: { Origin: origin } })).status, 200);
    }
    for (const origin of ['https://untrusted.example', 'https://frontend.example.evil.test']) {
      const response = await fetch(`${base}/api/events`, { headers: { Origin: origin } });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
