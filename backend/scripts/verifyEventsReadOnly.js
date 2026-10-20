// Read-only verification of the main Express server against the configured Atlas database.
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const path = require('node:path');
async function main() {
  const connection = await mongoose.createConnection(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 }).asPromise();
  const snapshot = async () => {
    const data = {};
    for (const name of ['events', 'enrollments']) data[name] = await connection.db.collection(name).find({}).sort({ _id: 1 }).toArray();
    return { data, hash: createHash('sha256').update(JSON.stringify(data)).digest('hex') };
  };
  let child;
  try {
    const before = await snapshot();
    const port = 5187;
    child = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Main backend startup timed out')), 20000);
      child.on('exit', () => { clearTimeout(timer); reject(new Error('Main backend exited before startup')); });
      child.stdout.on('data', chunk => { if (chunk.toString().includes('Server running')) { clearTimeout(timer); resolve(); } });
    });
    const get = async (endpoint, token) => {
      const response = await fetch('http://127.0.0.1:' + port + endpoint, { headers: token ? { Authorization: 'Bearer ' + token } : {}, signal: AbortSignal.timeout(15000) });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await get('/')).status, 200);
    const listing = await get('/api/events?limit=50'); assert.equal(listing.status, 200);
    assert.equal(listing.body.total, before.data.events.filter(e => e.published && new Date(e.endsAt) > new Date()).length);
    for (const event of listing.body.events) {
      assert.ok(before.data.events.some(row => String(row._id) === event._id));
      assert.equal(typeof event.host, 'string'); assert.ok(event.agenda.every(item => typeof item === 'string'));
      assert.equal(event.meetingUrl, undefined); assert.equal(event.joinUrl, undefined);
      const detail = await get('/api/events/' + event.slug); assert.equal(detail.status, 200); assert.equal(detail.body.event._id, event._id);
    }
    assert.equal((await get('/api/events/mine')).status, 401);
    let checked = 0;
    for (const user of new Set(before.data.enrollments.map(row => String(row.user)))) {
      const rows = before.data.enrollments.filter(row => String(row.user) === user);
      // My events can reconcile payments. Only inspect accounts without pending payments.
      if (rows.some(row => row.paymentStatus === 'pending')) continue;
      const mine = await get('/api/events/mine', jwt.sign({ userId: user }, process.env.JWT_SECRET, { expiresIn: '1m' }));
      assert.equal(mine.status, 200); assert.equal(mine.body.enrollments.length, rows.length);
      for (const row of rows) assert.ok(mine.body.enrollments.some(item => item._id === String(row._id) && item.reference === row.reference));
      checked += rows.length;
    }
    assert.equal((await snapshot()).hash, before.hash, 'Existing Atlas Events records changed during read-only verification');
    console.log(JSON.stringify({ mainBackend: 'passed', events: before.data.events.length, existingEnrollmentsVerified: checked, recordsUnchanged: true }));
  } finally {
    if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    await connection.close();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
