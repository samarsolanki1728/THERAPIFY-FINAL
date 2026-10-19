const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
process.env.CHAT_ENCRYPTION_KEY = randomBytes(32).toString('base64');
const { getEncryptionKey, encryptChatText, decryptChatText, isEncrypted, encryptLegacyConversation } = require('../services/chatEncryptionService');
const Conversation = require('../models/Conversation');
const { migrateCollection } = require('../scripts/encryptExistingChats');
const user = new mongoose.Types.ObjectId();
const clone = object => JSON.parse(JSON.stringify(object));

test('authenticated encryption round-trips Unicode, uses fresh IVs and rejects tampering', () => {
  const text = 'Private feelings — नमस्ते 😊\nA second line';
  const first = encryptChatText(text, 'message');
  const second = encryptChatText(text, 'message');
  assert.ok(isEncrypted(first)); assert.notEqual(first, second); assert.ok(!first.includes(text));
  assert.equal(decryptChatText(first, 'message'), text);
  assert.throws(() => decryptChatText(first, 'title'), /could not be decrypted/);
  const bytes = Buffer.from(first.slice('tfenc:v1:'.length), 'base64url'); bytes[28] ^= 1;
  assert.throws(() => decryptChatText('tfenc:v1:' + bytes.toString('base64url'), 'message'), /could not be decrypted/);
  assert.throws(() => decryptChatText('tfenc:v2:invalid', 'message'), /could not be decrypted/);
});

test('missing, invalid and wrong keys fail closed without leaking chat text', () => {
  const configured = process.env.CHAT_ENCRYPTION_KEY;
  const cipher = encryptChatText('very private', 'message');
  try {
    delete process.env.CHAT_ENCRYPTION_KEY;
    assert.throws(getEncryptionKey, /CHAT_ENCRYPTION_KEY/);
    assert.throws(() => encryptChatText('very private', 'message'), /CHAT_ENCRYPTION_KEY/);
    process.env.CHAT_ENCRYPTION_KEY = 'weak-password'; assert.throws(getEncryptionKey, /CHAT_ENCRYPTION_KEY/);
    process.env.CHAT_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    assert.throws(() => decryptChatText(cipher, 'message'), /could not be decrypted/);
  } finally { process.env.CHAT_ENCRYPTION_KEY = configured; }
});

test('model stores ciphertext while document getters and authenticated API JSON expose plaintext', async () => {
  const doc = new Conversation({ user, title: '  My private title  ', messages: [
    { role: 'user', text: 'My private message', recommendedExercises: [{ id: 'breath', title: 'Private exercise', reason: 'A private reason', url: '/wellness?activity=breath' }] }
  ] });
  await doc.validate();
  const raw = doc.toObject({ getters: false });
  assert.ok(isEncrypted(raw.title)); assert.ok(isEncrypted(raw.messages[0].text));
  for (const field of ['title', 'reason', 'url']) assert.ok(isEncrypted(raw.messages[0].recommendedExercises[0][field]));
  assert.equal(doc.title, 'My private title'); assert.equal(doc.messages[0].text, 'My private message');
  const json = clone(doc);
  assert.equal(json.title, 'My private title'); assert.equal(json.messages[0].text, 'My private message');
  assert.equal(json.messages[0].recommendedExercises[0].reason, 'A private reason');
  const hydrated = Conversation.hydrate(raw);
  assert.equal(hydrated.title, doc.title); assert.equal(hydrated.messages[0].text, doc.messages[0].text);
});

test('validation uses plaintext lengths, and ciphertext-looking user input is encrypted again', async () => {
  const long = new Conversation({ user, messages: [{ role: 'user', text: 'a'.repeat(5000) }] });
  await long.validate();
  const invalid = new Conversation({ user, messages: [{ role: 'user', text: 'a'.repeat(5001) }] });
  await assert.rejects(invalid.validate(), /Invalid chat field length/);
  const typed = encryptChatText('hidden', 'message');
  const doc = new Conversation({ user, messages: [{ role: 'user', text: typed }] });
  assert.equal(doc.messages[0].text, typed);
  assert.notEqual(doc.toObject({ getters: false }).messages[0].text, typed);
});

test('actual Mongoose create/save and rename writes contain ciphertext; reload/append stays readable', async t => {
  let persisted;
  t.mock.method(Conversation.collection, 'insertOne', async raw => { persisted = clone(raw); return { acknowledged: true, insertedId: raw._id }; });
  t.mock.method(Conversation.collection, 'findOne', async () => persisted);
  let renamed;
  t.mock.method(Conversation.collection, 'findOneAndUpdate', async (filter, update) => {
    renamed = clone(update); persisted.title = update.$set.title;
    return persisted;
  });
  let appended;
  t.mock.method(Conversation.collection, 'updateOne', async (filter, update) => { appended = clone(update); return { acknowledged: true, matchedCount: 1, modifiedCount: 1 }; });
  const created = await Conversation.create({ user, title: 'Private test title', messages: [{ role: 'user', text: 'Secret first message' }] });
  assert.ok(isEncrypted(persisted.title)); assert.ok(isEncrypted(persisted.messages[0].text));
  assert.ok(!JSON.stringify(persisted).includes('Secret first message'));
  const result = await Conversation.findOneAndUpdate({ _id: created._id, user }, { $set: { title: 'Renamed private title' } }, { returnDocument: 'after', runValidators: true });
  assert.ok(isEncrypted(renamed.$set.title)); assert.equal(result.title, 'Renamed private title');
  const loaded = await Conversation.findOne({ _id: created._id, user });
  assert.equal(loaded.messages[0].text, 'Secret first message');
  loaded.messages.push({ role: 'ai', text: 'A private reply' }); await loaded.save();
  assert.ok(!JSON.stringify(appended).includes('A private reply'));
  const newMessage = appended.$push?.messages?.$each?.[0] || appended.$set?.messages?.[1];
  assert.ok(newMessage && isEncrypted(newMessage.text));
  assert.equal(loaded.messages[1].text, 'A private reply');
});

test('saving a hydrated legacy conversation encrypts unedited old messages', async t => {
  let written;
  t.mock.method(Conversation.collection, 'updateOne', async (filter, update) => { written = clone(update); return { acknowledged: true, matchedCount: 1, modifiedCount: 1 }; });
  const doc = Conversation.hydrate({ _id: new mongoose.Types.ObjectId(), user, title: 'Old title', messages: [{ _id: new mongoose.Types.ObjectId(), role: 'user', text: 'Old text' }], __v: 0 });
  assert.equal(doc.messages[0].text, 'Old text');
  doc.messages.push({ role: 'ai', text: 'New response' }); await doc.save();
  assert.ok(isEncrypted(doc.toObject({ getters: false }).title));
  assert.ok(doc.toObject({ getters: false }).messages.every(message => isEncrypted(message.text)));
  assert.ok(!JSON.stringify(written).includes('Old text'));
  assert.equal(doc.messages[0].text, 'Old text'); assert.equal(doc.messages[1].text, 'New response');
});

test('legacy migration preserves IDs/timestamps, is idempotent, and detects concurrent changes', async () => {
  let record = { _id: 'test', title: 'Old title', updatedAt: 'unchanged', messages: [{ _id: 'msg', role: 'user', text: 'Old text', createdAt: 'unchanged' }] };
  const collection = {
    find: () => [clone(record)],
    async updateOne(filter, update) { assert.deepEqual(filter.messages.$eq, record.messages); record = { ...record, ...update.$set }; return { matchedCount: 1 }; }
  };
  const check = await migrateCollection(collection); assert.equal(check.needsEncryption, 1); assert.equal(record.title, 'Old title');
  const applied = await migrateCollection(collection, { apply: true }); assert.equal(applied.migrated, 1);
  assert.equal(record.updatedAt, 'unchanged'); assert.equal(record.messages[0]._id, 'msg'); assert.equal(record.messages[0].createdAt, 'unchanged');
  assert.equal(decryptChatText(record.messages[0].text, 'message'), 'Old text');
  assert.deepEqual(encryptLegacyConversation(record), {});
  assert.equal((await migrateCollection(collection, { apply: true })).migrated, 0);
  record.title = 'Concurrent rename'; collection.updateOne = async () => ({ matchedCount: 0 });
  assert.equal((await migrateCollection(collection, { apply: true })).conflicts, 1);
});

test('migration checks every encrypted record before writes and stops on unreadable ciphertext', async () => {
  let writes = 0;
  const result = await migrateCollection({ find: () => [{ _id: 'legacy', title: 'Plain title' }, { _id: 'corrupt', title: 'tfenc:v1:invalid' }], updateOne: async () => { writes++; } }, { apply: true });
  assert.equal(result.unreadable, 1); assert.equal(writes, 0);
});
