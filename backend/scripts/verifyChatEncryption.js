// Live, isolated smoke check. Uses temporary synthetic IDs and deletes only its
// own probe records. It never prints real chat text, keys, or tokens.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { isEncrypted, decryptChatText } = require('../services/chatEncryptionService');

async function main() {
  const probeUser = new mongoose.Types.ObjectId();
  const otherProbeUser = new mongoose.Types.ObjectId();
  const base = `http://localhost:${process.env.PORT || 5001}`;
  const token = jwt.sign({ userId: String(probeUser), role: 'client' }, process.env.JWT_SECRET, { expiresIn: '2m' });
  const otherToken = jwt.sign({ userId: String(otherProbeUser), role: 'client' }, process.env.JWT_SECRET, { expiresIn: '2m' });
  async function request(suffix, { method = 'GET', body, auth = token } = {}) {
    const response = await fetch(base + '/api/chat' + suffix, { method, signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const collection = mongoose.connection.collection('conversations');
  try {
    const created = await request('/conversations', { method: 'POST', body: { title: 'Encryption smoke check' } });
    assert.equal(created.status, 201);
    const id = created.data.conversation._id;
    let raw = await collection.findOne({ _id: new mongoose.Types.ObjectId(id), user: probeUser });
    assert.ok(isEncrypted(raw.title)); assert.ok(raw.messages.every(message => isEncrypted(message.text)));
    assert.equal(created.data.conversation.title, 'Encryption smoke check');
    assert.equal(decryptChatText(raw.messages[0].text, 'message'), created.data.conversation.messages[0].text);
    const renamed = await request(`/conversations/${id}`, { method: 'PATCH', body: { title: 'Renamed smoke check' } });
    assert.equal(renamed.status, 200); assert.equal(renamed.data.conversation.title, 'Renamed smoke check');
    // An explicitly off-topic input exercises append/persistence without a Gemini call.
    const appended = await request('', { method: 'POST', body: { conversationId: id, message: 'calculate 2+2' } });
    assert.equal(appended.status, 200); assert.equal(appended.data.outOfScope, true);
    raw = await collection.findOne({ _id: new mongoose.Types.ObjectId(id), user: probeUser });
    assert.ok(raw.messages.every(message => isEncrypted(message.text))); assert.ok(isEncrypted(raw.title));
    const history = await request(`/conversations/${id}`); assert.equal(history.status, 200);
    assert.equal(history.data.conversation.messages[1].text, 'calculate 2+2');
    const list = await request('/conversations'); assert.equal(list.status, 200);
    assert.equal(list.data.conversations[0].title, 'Renamed smoke check');
    assert.ok(!list.data.conversations[0].lastMessageSnippet.startsWith('tfenc:'));
    assert.equal((await request(`/conversations/${id}`, { auth: otherToken })).status, 404);
    const deleted = await request(`/conversations/${id}`, { method: 'DELETE' }); assert.equal(deleted.status, 200);
    assert.equal(await collection.countDocuments({ user: probeUser }), 0);
    console.log('PASS: live create, rename, append, list, history, user isolation and deletion; Atlas contains encrypted content. No Gemini request was made.');
  } finally {
    await collection.deleteMany({ user: probeUser });
    await mongoose.disconnect();
  }
}
main().catch(() => { console.error('Live encryption verification failed. No chat content or key material was logged.'); process.exitCode = 1; });
